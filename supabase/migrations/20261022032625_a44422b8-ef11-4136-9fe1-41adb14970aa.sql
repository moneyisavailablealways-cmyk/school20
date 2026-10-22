REVOKE EXECUTE ON FUNCTION public.attendance_class_access(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_weekly_attendance_config(date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.save_weekly_attendance(text,jsonb) FROM anon;
COMMENT ON FUNCTION public.attendance_class_access(uuid) IS 'Authenticated RLS helper; verifies active caller and same-school class assignment. Signed-in execution is intentional.';
COMMENT ON FUNCTION public.get_weekly_attendance_config(date) IS 'Authenticated school configuration endpoint; derives school exclusively from active auth.uid(). Signed-in execution is intentional.';
COMMENT ON FUNCTION public.save_weekly_attendance(text,jsonb) IS 'Authenticated transactional attendance endpoint; validates caller role, tenant, enrollment, calendar, session and lock rules. Signed-in execution is intentional.';