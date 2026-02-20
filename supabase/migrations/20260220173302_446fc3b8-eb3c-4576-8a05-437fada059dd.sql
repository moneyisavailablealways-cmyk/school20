
-- ============================================================
-- PHASE 1: School-level data isolation via RESTRICTIVE policies
-- ============================================================

-- STEP 1: Create is_super_admin() helper function
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
  );
$$;

-- ============================================================
-- STEP 2: Add RESTRICTIVE policies to all tables with school_id
-- These ensure cross-school data isolation while allowing super_admin bypass
-- ============================================================

-- 2a. PROFILES - school isolation
CREATE POLICY "School isolation for profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  school_id = get_current_school_id()
  OR school_id IS NULL
  OR is_super_admin()
  OR user_id = auth.uid()
);

-- 2b. CLASSES - school isolation
CREATE POLICY "School isolation for classes"
ON public.classes
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  school_id = get_current_school_id()
  OR school_id IS NULL
  OR is_super_admin()
);

-- 2c. LEVELS - school isolation
CREATE POLICY "School isolation for levels"
ON public.levels
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  school_id = get_current_school_id()
  OR school_id IS NULL
  OR is_super_admin()
);

-- 2d. ACADEMIC_YEARS - school isolation
CREATE POLICY "School isolation for academic_years"
ON public.academic_years
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  school_id = get_current_school_id()
  OR school_id IS NULL
  OR is_super_admin()
);

-- 2e. STUDENTS - school isolation
CREATE POLICY "School isolation for students"
ON public.students
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  school_id = get_current_school_id()
  OR school_id IS NULL
  OR is_super_admin()
);

-- 2f. ANNOUNCEMENTS - school isolation
CREATE POLICY "School isolation for announcements"
ON public.announcements
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  school_id = get_current_school_id()
  OR school_id IS NULL
  OR is_super_admin()
);

-- 2g. FEE_STRUCTURES - school isolation
CREATE POLICY "School isolation for fee_structures"
ON public.fee_structures
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  school_id = get_current_school_id()
  OR school_id IS NULL
  OR is_super_admin()
);
