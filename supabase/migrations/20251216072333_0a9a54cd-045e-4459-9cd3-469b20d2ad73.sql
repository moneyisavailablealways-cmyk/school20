-- Fix infinite recursion by ensuring role-check helpers bypass RLS,
-- and by removing direct profiles queries from fee_structures policies.

BEGIN;

-- 1) Ensure helper functions bypass RLS inside their body
-- NOTE: row_security=off is required to avoid re-entering profiles RLS policies.

CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'principal')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_principal()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'principal')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_bursar_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND role IN ('bursar', 'admin', 'principal')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_parent_of_student_profile(target_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parent_student_relationships psr
    JOIN public.profiles parent_p ON parent_p.id = psr.parent_id
    JOIN public.students s ON s.id = psr.student_id
    WHERE parent_p.user_id = auth.uid()
      AND s.profile_id = target_profile_id
  );
$$;

-- 2) Rewrite fee_structures policies to use the helper functions (no direct profiles SELECT)
DROP POLICY IF EXISTS "Bursar can manage fee structures" ON public.fee_structures;
CREATE POLICY "Bursar can manage fee structures"
ON public.fee_structures
FOR ALL
USING (public.is_bursar_user())
WITH CHECK (public.is_bursar_user());

DROP POLICY IF EXISTS "Staff can view fee structures" ON public.fee_structures;
CREATE POLICY "Staff can view fee structures"
ON public.fee_structures
FOR SELECT
USING (
  public.is_bursar_user()
  OR public.is_admin_or_principal()
  OR public.is_staff_admin()
  OR public.is_teacher()
);

COMMIT;