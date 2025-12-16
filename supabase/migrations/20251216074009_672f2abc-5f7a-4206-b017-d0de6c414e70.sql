-- Fix ALL remaining recursive RLS policies on profiles table

BEGIN;

-- Drop all problematic policies that query profiles table directly
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view active profiles for appointments" ON public.profiles;
DROP POLICY IF EXISTS "Bursar can view student profiles" ON public.profiles;
DROP POLICY IF EXISTS "Bursar can view student profiles for invoicing" ON public.profiles;
DROP POLICY IF EXISTS "Parents can view their children's profiles" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can view student profiles in their classes" ON public.profiles;

-- Recreate all policies using safe patterns (no subqueries on profiles)
-- Policy 1: Users can view their own profile (direct comparison, no subquery)
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

-- Policy 2: Users can update their own profile (direct comparison)
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Admins can view all profiles (uses helper function)
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (is_admin_user());

-- Policy 4: Admins can insert profiles (uses helper function)
CREATE POLICY "Admins can insert profiles"
ON public.profiles FOR INSERT
WITH CHECK (is_admin_user());

-- Policy 5: Bursar can view profiles for invoicing (uses helper function)
CREATE POLICY "Bursar can view profiles for invoicing"
ON public.profiles FOR SELECT
USING (is_bursar_user());

-- Policy 6: Parents can view their children's profiles (uses helper function)
CREATE POLICY "Parents can view their children's profiles"
ON public.profiles FOR SELECT
USING (is_parent_of_student_profile(id));

-- Policy 7: Teachers can view student profiles (uses helper function)
CREATE POLICY "Teachers can view student profiles in their classes"
ON public.profiles FOR SELECT
USING (is_teacher_of_student(id));

-- Also fix is_teacher_of_student to bypass RLS
CREATE OR REPLACE FUNCTION public.is_teacher_of_student(student_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM students s
    INNER JOIN student_enrollments se ON s.id = se.student_id
    INNER JOIN classes c ON se.class_id = c.id
    INNER JOIN profiles p ON p.id = c.class_teacher_id
    WHERE s.profile_id = student_profile_id
    AND p.user_id = auth.uid()
    AND se.status = 'active'
  );
$$;

COMMIT;