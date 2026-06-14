
-- 1. Profiles: remove overly broad "all active profiles" read
DROP POLICY IF EXISTS "Authenticated users can view profiles for appointments" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles in same school"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND school_id IS NOT NULL
  AND school_id = public.get_current_school_id()
);

-- 2. Announcements: require authentication for parent-targeted reads
DROP POLICY IF EXISTS "Parents can view relevant announcements" ON public.announcements;

CREATE POLICY "Authenticated users can view relevant announcements"
ON public.announcements
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (published_date IS NULL OR published_date <= now())
  AND (expiry_date IS NULL OR expiry_date > now())
  AND ('all' = ANY (target_audience) OR 'parents' = ANY (target_audience))
);

-- 3. student_medical_info: add school isolation RESTRICTIVE policy
ALTER TABLE public.student_medical_info ADD COLUMN IF NOT EXISTS school_id uuid;
UPDATE public.student_medical_info smi
SET school_id = s.school_id
FROM public.students s
WHERE smi.student_id = s.id AND smi.school_id IS NULL;

CREATE POLICY "School isolation for medical info"
ON public.student_medical_info
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  school_id IS NULL
  OR school_id = public.get_current_school_id()
  OR public.is_super_admin()
)
WITH CHECK (
  school_id IS NULL
  OR school_id = public.get_current_school_id()
  OR public.is_super_admin()
);

CREATE OR REPLACE FUNCTION public.auto_set_medical_info_school_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.school_id IS NULL AND NEW.student_id IS NOT NULL THEN
    SELECT school_id INTO NEW.school_id FROM public.students WHERE id = NEW.student_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_medical_info_school_id ON public.student_medical_info;
CREATE TRIGGER set_medical_info_school_id
BEFORE INSERT OR UPDATE ON public.student_medical_info
FOR EACH ROW EXECUTE FUNCTION public.auto_set_medical_info_school_id();

-- 4. student_emergency_contacts: add school isolation
ALTER TABLE public.student_emergency_contacts ADD COLUMN IF NOT EXISTS school_id uuid;
UPDATE public.student_emergency_contacts sec
SET school_id = s.school_id
FROM public.students s
WHERE sec.student_id = s.id AND sec.school_id IS NULL;

CREATE POLICY "School isolation for emergency contacts"
ON public.student_emergency_contacts
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  school_id IS NULL
  OR school_id = public.get_current_school_id()
  OR public.is_super_admin()
)
WITH CHECK (
  school_id IS NULL
  OR school_id = public.get_current_school_id()
  OR public.is_super_admin()
);

CREATE OR REPLACE FUNCTION public.auto_set_emergency_contact_school_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.school_id IS NULL AND NEW.student_id IS NOT NULL THEN
    SELECT school_id INTO NEW.school_id FROM public.students WHERE id = NEW.student_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_emergency_contact_school_id ON public.student_emergency_contacts;
CREATE TRIGGER set_emergency_contact_school_id
BEFORE INSERT OR UPDATE ON public.student_emergency_contacts
FOR EACH ROW EXECUTE FUNCTION public.auto_set_emergency_contact_school_id();

-- 5. salary_payments: restrictive school isolation
CREATE POLICY "School isolation for salary payments"
ON public.salary_payments
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  school_id = public.get_current_school_id()
  OR public.is_super_admin()
)
WITH CHECK (
  school_id = public.get_current_school_id()
  OR public.is_super_admin()
);

-- 6. staff_salaries: restrictive school isolation
CREATE POLICY "School isolation for staff salaries"
ON public.staff_salaries
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  school_id = public.get_current_school_id()
  OR public.is_super_admin()
)
WITH CHECK (
  school_id = public.get_current_school_id()
  OR public.is_super_admin()
);

-- 7. teachers.salary: remove from teachers table (salary lives in staff_salaries)
ALTER TABLE public.teachers DROP COLUMN IF EXISTS salary;

-- 8. Storage: avatars ownership check (path = profile_id/...)
DROP POLICY IF EXISTS "Users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;

CREATE POLICY "Users can update own avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    public.is_admin_user()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.id::text = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "Users can delete own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    public.is_admin_user()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.id::text = (storage.foldername(name))[1]
    )
  )
);

-- 9. Storage: school-logos restrict to admin/principal
DROP POLICY IF EXISTS "Authenticated users can upload school logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update school logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete school logos" ON storage.objects;

CREATE POLICY "Admins can upload school logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'school-logos' AND public.is_admin_user());

CREATE POLICY "Admins can update school logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'school-logos' AND public.is_admin_user());

CREATE POLICY "Admins can delete school logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'school-logos' AND public.is_admin_user());

-- 10. Tighten "WITH CHECK (true)" insert policies on audit/system tables
DROP POLICY IF EXISTS "System can insert activity logs" ON public.activity_log;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.teacher_attendance_audit;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.attendance_audit_log;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.report_audit_log;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- These tables are populated by SECURITY DEFINER triggers/functions owned by postgres,
-- which bypass RLS. Restrict direct API inserts to service_role only.
CREATE POLICY "Service role inserts activity logs"
ON public.activity_log FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role inserts teacher attendance audit"
ON public.teacher_attendance_audit FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role inserts attendance audit"
ON public.attendance_audit_log FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role inserts report audit"
ON public.report_audit_log FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role inserts notifications"
ON public.notifications FOR INSERT TO service_role WITH CHECK (true);
