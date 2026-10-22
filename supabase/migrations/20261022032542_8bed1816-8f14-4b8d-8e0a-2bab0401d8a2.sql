ALTER TYPE public.teacher_attendance_status ADD VALUE IF NOT EXISTS 'excused';
ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_student_id_date_key;
ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_status_check;
ALTER TABLE public.attendance_records ADD CONSTRAINT attendance_records_status_check CHECK (status IN ('present','absent','late','excused','left_early'));

CREATE OR REPLACE FUNCTION public.attendance_class_access(p_class_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public SET row_security=off AS $$
 SELECT EXISTS (SELECT 1 FROM public.profiles p JOIN public.classes c ON c.school_id=p.school_id
 WHERE p.user_id=auth.uid() AND p.is_active AND c.id=p_class_id AND
 (p.role IN ('admin','principal','head_teacher') OR (p.role='teacher' AND (c.class_teacher_id=p.id OR EXISTS
 (SELECT 1 FROM public.streams s WHERE s.class_id=c.id AND s.school_id=p.school_id AND s.section_teacher_id=p.id)))));
$$;
REVOKE ALL ON FUNCTION public.attendance_class_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attendance_class_access(uuid) TO authenticated;
CREATE POLICY "Attendance weekly school boundary" ON public.attendance_records AS RESTRICTIVE FOR ALL TO authenticated
 USING (school_id=public.get_current_school_id()) WITH CHECK (school_id=public.get_current_school_id());
CREATE POLICY "Attendance authorized class inserts" ON public.attendance_records AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK (public.attendance_class_access(class_id));
CREATE POLICY "Attendance authorized class updates" ON public.attendance_records AS RESTRICTIVE FOR UPDATE TO authenticated
 USING (public.attendance_class_access(class_id) AND (NOT is_locked OR public.is_staff_admin()))
 WITH CHECK (public.attendance_class_access(class_id));
CREATE POLICY "Attendance authorized class deletes" ON public.attendance_records AS RESTRICTIVE FOR DELETE TO authenticated
 USING (public.attendance_class_access(class_id));
CREATE POLICY "Teacher weekly school boundary" ON public.teacher_attendance AS RESTRICTIVE FOR ALL TO authenticated
 USING (school_id=public.get_current_school_id()) WITH CHECK (school_id=public.get_current_school_id());

CREATE OR REPLACE FUNCTION public.get_weekly_attendance_config(p_date date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public SET row_security=off AS $$
DECLARE v_school uuid; v_year uuid; v_settings jsonb; v_days integer[]; v_timezone text;
BEGIN
 SELECT school_id INTO v_school FROM public.profiles WHERE user_id=auth.uid() AND is_active;
 IF v_school IS NULL THEN RAISE EXCEPTION 'An active school account is required.'; END IF;
 SELECT id INTO v_year FROM public.academic_years WHERE school_id=v_school AND p_date BETWEEN start_date AND end_date ORDER BY start_date DESC LIMIT 1;
 SELECT school_days INTO v_days FROM public.timetable_generation_config WHERE school_id=v_school AND (academic_year_id=v_year OR academic_year_id IS NULL)
 ORDER BY (academic_year_id=v_year) DESC NULLS LAST,updated_at DESC LIMIT 1;
 SELECT to_jsonb(s) INTO v_settings FROM public.attendance_settings s WHERE school_id=v_school LIMIT 1;
 SELECT timezone INTO v_timezone FROM public.schools WHERE id=v_school;
 RETURN jsonb_build_object('school_days',COALESCE(v_days,ARRAY[1,2,3,4,5]),'settings',v_settings,'timezone',COALESCE(v_timezone,'Africa/Kampala'),'academic_year_id',v_year);
END; $$;
REVOKE ALL ON FUNCTION public.get_weekly_attendance_config(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_weekly_attendance_config(date) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_weekly_attendance(p_kind text,p_records jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public SET row_security=off AS $$
DECLARE v_actor public.profiles%ROWTYPE; v_item jsonb; v_config jsonb; v_date date; v_person uuid; v_class uuid;
 v_status text; v_session text; v_today date; v_now timestamp; v_existing public.attendance_records%ROWTYPE; v_count integer:=0;
BEGIN
 SELECT * INTO v_actor FROM public.profiles WHERE user_id=auth.uid() AND is_active;
 IF v_actor.id IS NULL OR v_actor.school_id IS NULL THEN RAISE EXCEPTION 'An active school account is required.'; END IF;
 IF p_kind NOT IN ('student','teacher') OR jsonb_typeof(p_records)<>'array' OR jsonb_array_length(p_records)>1000 THEN RAISE EXCEPTION 'Invalid attendance request (maximum 1000 changes).'; END IF;
 IF p_kind='teacher' AND v_actor.role NOT IN ('admin','principal','head_teacher') THEN RAISE EXCEPTION 'Only school administrators can mark teacher attendance.'; END IF;
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_records) LOOP
  v_date:=(v_item->>'date')::date; v_person:=(v_item->>'person_id')::uuid; v_status:=v_item->>'status';
  IF v_date IS NULL OR v_person IS NULL OR v_status IS NULL THEN RAISE EXCEPTION 'Attendance requires a name, date, and status.'; END IF;
  v_config:=public.get_weekly_attendance_config(v_date);
  v_now:=now() AT TIME ZONE (v_config->>'timezone'); v_today:=v_now::date;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(v_config->'school_days') d WHERE d::integer=extract(isodow FROM v_date)::integer) THEN RAISE EXCEPTION 'Attendance cannot be marked on a non-working day (%).',v_date; END IF;
  IF EXISTS (SELECT 1 FROM public.school_calendar WHERE school_id=v_actor.school_id AND date=v_date AND event_type IN ('holiday','public_holiday','school_holiday','non_working_day')) THEN RAISE EXCEPTION 'Attendance cannot be marked on a school holiday (%).',v_date; END IF;
  IF v_date>v_today AND NOT COALESCE((v_config->'settings'->>'allow_future_attendance')::boolean,false) THEN RAISE EXCEPTION 'Future attendance is disabled for your school.'; END IF;
  IF p_kind='student' THEN
   v_class:=(v_item->>'class_id')::uuid; v_session:=COALESCE(v_item->>'session','full_day');
   IF NOT public.attendance_class_access(v_class) THEN RAISE EXCEPTION 'You are not authorized to mark attendance for this class.'; END IF;
   IF NOT EXISTS (SELECT 1 FROM public.students s JOIN public.student_enrollments e ON e.student_id=s.id
     WHERE s.id=v_person AND s.school_id=v_actor.school_id AND e.school_id=v_actor.school_id AND e.class_id=v_class AND e.status='active'
     AND (e.academic_year_id=(v_config->>'academic_year_id')::uuid OR e.academic_year_id IS NULL)) THEN RAISE EXCEPTION 'The learner/student is not enrolled in this school and class for the selected year.'; END IF;
   IF v_status NOT IN ('present','absent','late','excused','left_early') THEN RAISE EXCEPTION 'Invalid learner/student attendance status.'; END IF;
   IF v_session NOT IN ('full_day','morning','afternoon') OR (v_session<>'full_day' AND NOT COALESCE((v_config->'settings'->>'enable_multiple_sessions')::boolean,false)) THEN RAISE EXCEPTION 'This attendance session is not enabled.'; END IF;
   SELECT * INTO v_existing FROM public.attendance_records WHERE school_id=v_actor.school_id AND student_id=v_person AND class_id=v_class AND date=v_date AND session=v_session FOR UPDATE;
   IF FOUND AND v_existing.is_locked THEN RAISE EXCEPTION 'Attendance is locked for %. Use the existing override workflow.',v_date; END IF;
   IF COALESCE((v_config->'settings'->>'auto_lock_enabled')::boolean,false) AND (v_date<v_today OR (v_date=v_today AND v_now::time>=COALESCE((v_config->'settings'->>'lock_time')::time,'18:00'::time))) THEN RAISE EXCEPTION 'Attendance has passed the school lock time. Use the existing override workflow.'; END IF;
   INSERT INTO public.attendance_records(school_id,student_id,class_id,date,session,status,remarks,marked_by,last_modified_by,last_modified_at,level_type)
   VALUES(v_actor.school_id,v_person,v_class,v_date,v_session,v_status,v_item->>'remarks',v_actor.id,v_actor.id,now(),(SELECT COALESCE(school_level,'primary')::public.section_level_type FROM public.schools WHERE id=v_actor.school_id))
   ON CONFLICT(student_id,class_id,date,session) DO UPDATE SET status=excluded.status,remarks=excluded.remarks,last_modified_by=v_actor.id,last_modified_at=now()
   WHERE public.attendance_records.school_id=v_actor.school_id AND NOT public.attendance_records.is_locked;
  ELSE
   IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=v_person AND school_id=v_actor.school_id AND role='teacher' AND is_active) THEN RAISE EXCEPTION 'Teacher not found in your school.'; END IF;
   IF v_status NOT IN ('present','absent','late','excused','sick_leave','vacation_leave','half_day','pending_approval') THEN RAISE EXCEPTION 'Invalid teacher attendance status.'; END IF;
   INSERT INTO public.teacher_attendance(school_id,teacher_id,date,status,remarks,check_in_time,check_out_time,late_reason,marked_by,is_self_marked,is_approved,approved_by,academic_year_id)
   VALUES(v_actor.school_id,v_person,v_date,v_status::public.teacher_attendance_status,v_item->>'remarks',(v_item->>'check_in_time')::time,(v_item->>'check_out_time')::time,v_item->>'late_reason',v_actor.id,false,true,v_actor.id,(v_config->>'academic_year_id')::uuid)
   ON CONFLICT(teacher_id,date) DO UPDATE SET status=excluded.status,remarks=excluded.remarks,check_in_time=excluded.check_in_time,check_out_time=excluded.check_out_time,late_reason=excluded.late_reason,marked_by=v_actor.id,is_approved=true,approved_by=v_actor.id
   WHERE public.teacher_attendance.school_id=v_actor.school_id;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Attendance changed concurrently or belongs to another school. Refresh and try again.'; END IF;
  v_count:=v_count+1;
 END LOOP;
 RETURN v_count;
END; $$;
REVOKE ALL ON FUNCTION public.save_weekly_attendance(text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_weekly_attendance(text,jsonb) TO authenticated;