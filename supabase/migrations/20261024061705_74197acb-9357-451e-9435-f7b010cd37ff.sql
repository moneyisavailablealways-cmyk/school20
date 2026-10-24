CREATE POLICY "Teacher attendance class visibility" ON public.attendance_records AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT public.is_teacher() OR public.attendance_class_access(class_id));
CREATE OR REPLACE FUNCTION public.attendance_working_date(p_date date)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public SET row_security=off AS $$
 SELECT NOT EXISTS (SELECT 1 FROM public.school_calendar WHERE school_id=public.get_current_school_id() AND date=p_date AND event_type IN ('holiday','break','public_holiday','school_holiday','non_working_day'));
$$;
REVOKE ALL ON FUNCTION public.attendance_working_date(date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.attendance_working_date(date) TO authenticated;
CREATE POLICY "Student attendance excludes holidays" ON public.attendance_records AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.attendance_working_date(date));
CREATE POLICY "Teacher attendance excludes holidays" ON public.teacher_attendance AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.attendance_working_date(date));