DROP POLICY IF EXISTS "Student attendance excludes holidays" ON public.attendance_records;
DROP POLICY IF EXISTS "Teacher attendance excludes holidays" ON public.teacher_attendance;
DROP FUNCTION IF EXISTS public.attendance_working_date(date);
DO $$ DECLARE definition text; BEGIN
 SELECT pg_get_functiondef('public.save_weekly_attendance(text,jsonb)'::regprocedure) INTO definition;
 definition:=replace(definition,'''holiday'',''public_holiday'',''school_holiday'',''non_working_day''','''holiday'',''break'',''public_holiday'',''school_holiday'',''non_working_day''');
 EXECUTE definition;
END $$;
REVOKE EXECUTE ON FUNCTION public.save_weekly_attendance(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_weekly_attendance(text,jsonb) TO authenticated;