UPDATE public.teachers t SET school_id=p.school_id FROM public.profiles p WHERE p.id=t.profile_id AND t.school_id IS NULL;
ALTER TABLE public.teachers ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.teachers DROP CONSTRAINT teachers_employee_id_key, ADD CONSTRAINT teachers_employee_id_key UNIQUE(school_id,employee_id);
ALTER TABLE public.teachers ADD CONSTRAINT teachers_school_profile_key UNIQUE(school_id,profile_id);
ALTER TABLE public.teacher_specializations ADD COLUMN school_id uuid REFERENCES public.schools(id);
UPDATE public.teacher_specializations ts SET school_id=t.school_id FROM public.teachers t WHERE t.id=ts.teacher_id;
ALTER TABLE public.teacher_specializations ALTER COLUMN school_id SET NOT NULL;
CREATE UNIQUE INDEX teacher_specializations_unassigned_subject_key ON public.teacher_specializations(school_id,teacher_id,subject_id) WHERE class_id IS NULL;
CREATE OR REPLACE FUNCTION public.validate_teacher_specialization_school() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public SET row_security=off AS $$
DECLARE v_school uuid;
BEGIN
 SELECT school_id INTO v_school FROM public.teachers WHERE id=NEW.teacher_id;
 IF v_school IS NULL THEN RAISE EXCEPTION 'Teacher record not found in this school.'; END IF;
 IF NEW.school_id IS NULL THEN NEW.school_id:=v_school; END IF;
 IF NEW.school_id IS DISTINCT FROM v_school OR NOT EXISTS(SELECT 1 FROM public.subjects WHERE id=NEW.subject_id AND school_id=v_school) OR (NEW.class_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.classes WHERE id=NEW.class_id AND school_id=v_school)) THEN RAISE EXCEPTION 'Teacher, subject, and class must belong to the same school.'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.validate_teacher_specialization_school() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_teacher_specialization_school BEFORE INSERT OR UPDATE ON public.teacher_specializations FOR EACH ROW EXECUTE FUNCTION public.validate_teacher_specialization_school();
CREATE POLICY teacher_specializations_school_boundary ON public.teacher_specializations AS RESTRICTIVE FOR ALL TO authenticated USING(school_id=public.get_current_school_id()) WITH CHECK(school_id=public.get_current_school_id());
CREATE POLICY teachers_assignment_school_boundary ON public.teachers AS RESTRICTIVE FOR ALL TO authenticated USING(school_id=public.get_current_school_id()) WITH CHECK(school_id=public.get_current_school_id());
CREATE OR REPLACE FUNCTION public.save_teacher_subject_assignments(p_school_id uuid,p_teacher_id uuid,p_assignments jsonb,p_replace boolean DEFAULT false) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public SET row_security=off AS $$
DECLARE v_subject uuid; v_class uuid; v_row jsonb; v_count integer:=0;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_staff_admin() OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=auth.uid() AND is_active AND school_id=p_school_id) THEN RAISE EXCEPTION 'You do not have permission to assign teachers in this school.'; END IF;
 PERFORM id FROM public.teachers WHERE id=p_teacher_id AND school_id=p_school_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Teacher record not found in this school. Reload the teacher before assigning subjects.'; END IF;
 IF p_assignments IS NULL OR jsonb_typeof(p_assignments)<>'array' THEN RAISE EXCEPTION 'Select valid subject assignments.'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_assignments) a GROUP BY a->>'subject_id',a->>'class_id' HAVING count(*)>1) THEN RAISE EXCEPTION 'This subject is already assigned to this teacher in this class.'; END IF;
 FOR v_row IN SELECT value FROM jsonb_array_elements(p_assignments) LOOP
  v_subject:=(v_row->>'subject_id')::uuid; v_class:=NULLIF(v_row->>'class_id','')::uuid;
  IF v_subject IS NULL OR NOT EXISTS(SELECT 1 FROM public.subjects WHERE id=v_subject AND school_id=p_school_id) OR (v_class IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.classes WHERE id=v_class AND school_id=p_school_id)) THEN RAISE EXCEPTION 'Select a subject and class from your school.'; END IF;
  IF NOT p_replace AND EXISTS(SELECT 1 FROM public.teacher_specializations WHERE school_id=p_school_id AND teacher_id=p_teacher_id AND subject_id=v_subject AND class_id IS NOT DISTINCT FROM v_class) THEN RAISE EXCEPTION 'This subject is already assigned to this teacher in this class.'; END IF;
 END LOOP;
 IF p_replace THEN
  DELETE FROM public.teacher_specializations ts WHERE ts.school_id=p_school_id AND ts.teacher_id=p_teacher_id AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_assignments) a WHERE (a->>'subject_id')::uuid=ts.subject_id AND NULLIF(a->>'class_id','')::uuid IS NOT DISTINCT FROM ts.class_id);
 END IF;
 FOR v_row IN SELECT value FROM jsonb_array_elements(p_assignments) LOOP
  v_subject:=(v_row->>'subject_id')::uuid; v_class:=NULLIF(v_row->>'class_id','')::uuid;
  IF NOT EXISTS(SELECT 1 FROM public.teacher_specializations WHERE school_id=p_school_id AND teacher_id=p_teacher_id AND subject_id=v_subject AND class_id IS NOT DISTINCT FROM v_class) THEN
   INSERT INTO public.teacher_specializations(school_id,teacher_id,subject_id,class_id) VALUES(p_school_id,p_teacher_id,v_subject,v_class);
   v_count:=v_count+1;
  END IF;
 END LOOP;
 RETURN v_count;
END; $$;
REVOKE ALL ON FUNCTION public.save_teacher_subject_assignments(uuid,uuid,jsonb,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_teacher_subject_assignments(uuid,uuid,jsonb,boolean) TO authenticated,service_role;