-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Teachers can view student profiles in their classes" ON profiles;

-- Create a security definer function to check if user is a class teacher for a student
CREATE OR REPLACE FUNCTION public.is_teacher_of_student(student_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- Create new policy using the security definer function
CREATE POLICY "Teachers can view student profiles in their classes"
ON profiles FOR SELECT
USING (
  public.is_teacher_of_student(id)
);