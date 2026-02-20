
-- ============================================================
-- PHASE 2: Add school_id to remaining critical tables
-- ============================================================

-- 1. SUBJECTS
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);
UPDATE public.subjects SET school_id = (
  SELECT l.school_id FROM public.levels l WHERE l.id = subjects.level_id
) WHERE school_id IS NULL AND level_id IS NOT NULL;

CREATE POLICY "School isolation for subjects"
ON public.subjects AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 2. SCHOOL_SETTINGS
ALTER TABLE public.school_settings ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for school_settings"
ON public.school_settings AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 3. SCHOOL_CALENDAR
ALTER TABLE public.school_calendar ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for school_calendar"
ON public.school_calendar AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 4. SCHOLARSHIPS
ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for scholarships"
ON public.scholarships AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 5. TEACHERS
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);
UPDATE public.teachers SET school_id = (
  SELECT p.school_id FROM public.profiles p WHERE p.id = teachers.profile_id
) WHERE school_id IS NULL;

CREATE POLICY "School isolation for teachers"
ON public.teachers AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 6. PARENTS
ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);
UPDATE public.parents SET school_id = (
  SELECT p.school_id FROM public.profiles p WHERE p.id = parents.profile_id
) WHERE school_id IS NULL;

CREATE POLICY "School isolation for parents"
ON public.parents AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 7. LIBRARY_ITEMS
ALTER TABLE public.library_items ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for library_items"
ON public.library_items AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 8. GRADING_CONFIG
ALTER TABLE public.grading_config ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for grading_config"
ON public.grading_config AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 9. REPORT_TEMPLATES
ALTER TABLE public.report_templates ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for report_templates"
ON public.report_templates AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 10. ATTENDANCE_SETTINGS
ALTER TABLE public.attendance_settings ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for attendance_settings"
ON public.attendance_settings AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 11. TIMETABLES
ALTER TABLE public.timetables ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for timetables"
ON public.timetables AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 12. STREAMS (inherits via classes but add for direct safety)
ALTER TABLE public.streams ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);
UPDATE public.streams SET school_id = (
  SELECT c.school_id FROM public.classes c WHERE c.id = streams.class_id
) WHERE school_id IS NULL AND class_id IS NOT NULL;

CREATE POLICY "School isolation for streams"
ON public.streams AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 13. NOTIFICATIONS (scoped by user_id but add school_id for safety)
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);
UPDATE public.notifications SET school_id = (
  SELECT p.school_id FROM public.profiles p WHERE p.id = notifications.user_id
) WHERE school_id IS NULL;

CREATE POLICY "School isolation for notifications"
ON public.notifications AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 14. INVOICES
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for invoices"
ON public.invoices AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 15. PAYMENTS
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for payments"
ON public.payments AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 16. BEHAVIOR_NOTES
ALTER TABLE public.behavior_notes ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for behavior_notes"
ON public.behavior_notes AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 17. ATTENDANCE_RECORDS
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for attendance_records"
ON public.attendance_records AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 18. TEACHER_ATTENDANCE
ALTER TABLE public.teacher_attendance ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for teacher_attendance"
ON public.teacher_attendance AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 19. REPORT_CARDS
ALTER TABLE public.report_cards ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for report_cards"
ON public.report_cards AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 20. GENERATED_REPORTS
ALTER TABLE public.generated_reports ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for generated_reports"
ON public.generated_reports AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 21. APPOINTMENT_REQUESTS
ALTER TABLE public.appointment_requests ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for appointment_requests"
ON public.appointment_requests AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 22. LIBRARY_TRANSACTIONS
ALTER TABLE public.library_transactions ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for library_transactions"
ON public.library_transactions AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 23. LIBRARY_RESERVATIONS
ALTER TABLE public.library_reservations ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for library_reservations"
ON public.library_reservations AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 24. LIBRARY_FINES
ALTER TABLE public.library_fines ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for library_fines"
ON public.library_fines AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 25. TERM_CONFIGURATIONS
ALTER TABLE public.term_configurations ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for term_configurations"
ON public.term_configurations AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 26. ACTIVITY_LOG
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for activity_log"
ON public.activity_log AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 27. STUDENT_ENROLLMENTS
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for student_enrollments"
ON public.student_enrollments AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 28. PARENT_STUDENT_RELATIONSHIPS
ALTER TABLE public.parent_student_relationships ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for parent_student_relationships"
ON public.parent_student_relationships AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 29. SUBJECT_SUBMISSIONS
ALTER TABLE public.subject_submissions ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for subject_submissions"
ON public.subject_submissions AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 30. TEACHER_ENROLLMENTS
ALTER TABLE public.teacher_enrollments ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for teacher_enrollments"
ON public.teacher_enrollments AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 31. STUDENT_SUBJECT_ENROLLMENTS
ALTER TABLE public.student_subject_enrollments ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for student_subject_enrollments"
ON public.student_subject_enrollments AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 32. APPOINTMENTS (legacy table)
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for appointments"
ON public.appointments AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 33. TEACHER_LEAVE_REQUESTS
ALTER TABLE public.teacher_leave_requests ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for teacher_leave_requests"
ON public.teacher_leave_requests AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 34. REPORT_COMMENTS
ALTER TABLE public.report_comments ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for report_comments"
ON public.report_comments AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 35. REPORT_SIGNATURES
ALTER TABLE public.report_signatures ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for report_signatures"
ON public.report_signatures AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- 36. PARENT_ENROLLMENTS
ALTER TABLE public.parent_enrollments ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

CREATE POLICY "School isolation for parent_enrollments"
ON public.parent_enrollments AS RESTRICTIVE FOR ALL TO authenticated
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

-- ============================================================
-- Backfill school_id for existing data using School20 Academy ID
-- ============================================================
DO $$
DECLARE
  v_school_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  UPDATE public.subjects SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.school_settings SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.school_calendar SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.scholarships SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.library_items SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.grading_config SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.report_templates SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.attendance_settings SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.timetables SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.invoices SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.payments SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.behavior_notes SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.attendance_records SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.teacher_attendance SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.report_cards SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.generated_reports SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.appointment_requests SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.library_transactions SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.library_reservations SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.library_fines SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.term_configurations SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.activity_log SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.student_enrollments SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.parent_student_relationships SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.subject_submissions SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.teacher_enrollments SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.student_subject_enrollments SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.appointments SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.teacher_leave_requests SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.report_comments SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.report_signatures SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.parent_enrollments SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.notifications SET school_id = v_school_id WHERE school_id IS NULL;
  UPDATE public.streams SET school_id = v_school_id WHERE school_id IS NULL;
END $$;
