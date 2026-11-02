-- 1. Only admin/principal and class (or stream) teachers may record learner attendance.
CREATE OR REPLACE FUNCTION public.attendance_class_access(p_class_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' SET row_security TO 'off'
AS $function$
 SELECT EXISTS (SELECT 1 FROM public.profiles p JOIN public.classes c ON c.school_id=p.school_id
 WHERE p.user_id=auth.uid() AND p.is_active AND c.id=p_class_id AND
 (p.role IN ('admin','principal') OR (p.role='teacher' AND (c.class_teacher_id=p.id OR EXISTS
 (SELECT 1 FROM public.streams s WHERE s.class_id=c.id AND s.school_id=p.school_id AND s.section_teacher_id=p.id)))));
$function$;

DO $mig$ DECLARE d text; BEGIN
 d := pg_get_functiondef('public.save_weekly_attendance(text,jsonb)'::regprocedure);
 d := replace(d, $q$v_actor.role NOT IN ('admin','principal','head_teacher')$q$, $q$v_actor.role NOT IN ('admin','principal')$q$);
 d := replace(d, $q$FOR v_item IN SELECT$q$, $q$IF v_actor.role='head_teacher' THEN RAISE EXCEPTION 'Head teachers have read-only access to attendance.'; END IF;
 FOR v_item IN SELECT$q$);
 EXECUTE d;
END $mig$;

-- Restrictive write rules so no other permissive policy can bypass them.
CREATE POLICY "Attendance writes require class authority" ON public.attendance_records AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK (public.attendance_class_access(class_id));
CREATE POLICY "Attendance updates require class authority" ON public.attendance_records AS RESTRICTIVE FOR UPDATE TO authenticated
 USING (public.attendance_class_access(class_id)) WITH CHECK (public.attendance_class_access(class_id));
CREATE POLICY "Attendance deletes require class authority" ON public.attendance_records AS RESTRICTIVE FOR DELETE TO authenticated
 USING (public.attendance_class_access(class_id));

CREATE POLICY "Teacher attendance writes admin or self" ON public.teacher_attendance AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK (public.is_admin_or_principal() OR teacher_id = public.get_current_profile_id());
CREATE POLICY "Teacher attendance updates admin or self" ON public.teacher_attendance AS RESTRICTIVE FOR UPDATE TO authenticated
 USING (public.is_admin_or_principal() OR teacher_id = public.get_current_profile_id())
 WITH CHECK (public.is_admin_or_principal() OR teacher_id = public.get_current_profile_id());
CREATE POLICY "Teacher attendance deletes admin only" ON public.teacher_attendance AS RESTRICTIVE FOR DELETE TO authenticated
 USING (public.is_admin_or_principal());

-- 2. Approval: admin, principal or head teacher may approve self-marked teacher attendance.
CREATE OR REPLACE FUNCTION public.approve_teacher_attendance(p_record_id uuid, p_approve boolean DEFAULT true)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' SET row_security TO 'off'
AS $function$
DECLARE v_actor public.profiles%ROWTYPE;
BEGIN
 SELECT * INTO v_actor FROM public.profiles WHERE user_id=auth.uid() AND is_active;
 IF v_actor.id IS NULL OR v_actor.role NOT IN ('admin','principal','head_teacher') THEN RAISE EXCEPTION 'Only administrators or head teachers can approve attendance.'; END IF;
 UPDATE public.teacher_attendance SET is_approved=p_approve, approved_by=CASE WHEN p_approve THEN v_actor.id END, updated_at=now()
  WHERE id=p_record_id AND school_id=v_actor.school_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Attendance record not found in your school.'; END IF;
 RETURN true;
END; $function$;
REVOKE EXECUTE ON FUNCTION public.approve_teacher_attendance(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_teacher_attendance(uuid,boolean) TO authenticated;

-- 3. Settings save (creates the school's settings row when missing).
CREATE OR REPLACE FUNCTION public.save_attendance_settings(p_settings jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' SET row_security TO 'off'
AS $function$
DECLARE v_actor public.profiles%ROWTYPE; v_row public.attendance_settings%ROWTYPE;
BEGIN
 SELECT * INTO v_actor FROM public.profiles WHERE user_id=auth.uid() AND is_active;
 IF v_actor.id IS NULL OR v_actor.school_id IS NULL OR v_actor.role NOT IN ('admin','principal','head_teacher') THEN RAISE EXCEPTION 'Only administrators or head teachers can change attendance settings.'; END IF;
 IF p_settings ? 'lock_time' AND (p_settings->>'lock_time') !~ '^\d{2}:\d{2}(:\d{2})?$' THEN RAISE EXCEPTION 'Lock time must be a valid time (HH:MM).'; END IF;
 SELECT * INTO v_row FROM public.attendance_settings WHERE school_id=v_actor.school_id ORDER BY created_at LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN
  INSERT INTO public.attendance_settings(school_id) VALUES (v_actor.school_id) RETURNING * INTO v_row;
 END IF;
 UPDATE public.attendance_settings SET
  lock_time=COALESCE((p_settings->>'lock_time')::time, lock_time),
  auto_lock_enabled=COALESCE((p_settings->>'auto_lock_enabled')::boolean, auto_lock_enabled),
  allow_future_attendance=COALESCE((p_settings->>'allow_future_attendance')::boolean, allow_future_attendance),
  enable_multiple_sessions=COALESCE((p_settings->>'enable_multiple_sessions')::boolean, enable_multiple_sessions),
  updated_at=now()
 WHERE id=v_row.id RETURNING * INTO v_row;
 RETURN to_jsonb(v_row);
END; $function$;
REVOKE EXECUTE ON FUNCTION public.save_attendance_settings(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_attendance_settings(jsonb) TO authenticated;