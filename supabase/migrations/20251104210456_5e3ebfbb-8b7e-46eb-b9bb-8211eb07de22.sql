-- Fix infinite recursion in RLS policies for student_enrollments, students, and timetables

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Users can view enrollments" ON student_enrollments;
DROP POLICY IF EXISTS "Teachers can view their students" ON students;
DROP POLICY IF EXISTS "Admins can view students" ON students;
DROP POLICY IF EXISTS "Students can view their own profile" ON students;
DROP POLICY IF EXISTS "Parents can view their children" ON students;

-- Recreate simple, non-recursive policy for student_enrollments
CREATE POLICY "Allow staff and students to view enrollments"
ON student_enrollments
FOR SELECT
TO authenticated
USING (
  -- Staff can view all
  public.is_staff_admin()
  OR
  public.is_teacher()
  OR
  -- Students can view their own
  student_id IN (
    SELECT s.id FROM students s
    JOIN profiles p ON p.id = s.profile_id
    WHERE p.user_id = auth.uid()
  )
  OR
  -- Parents can view their children's
  student_id IN (
    SELECT psr.student_id FROM parent_student_relationships psr
    JOIN profiles p ON p.id = psr.parent_id
    WHERE p.user_id = auth.uid()
  )
);

-- Recreate simple policy for students table
CREATE POLICY "Staff can view all students"
ON students
FOR SELECT
TO authenticated
USING (
  public.is_staff_admin()
  OR
  public.is_teacher()
);

CREATE POLICY "Students can view their own profile"
ON students
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.id = students.profile_id
  )
);

CREATE POLICY "Parents can view their children"
ON students
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT psr.student_id FROM parent_student_relationships psr
    JOIN profiles p ON p.id = psr.parent_id
    WHERE p.user_id = auth.uid()
  )
);

-- Fix timetables table RLS if it exists
DROP POLICY IF EXISTS "Teachers can view timetables" ON timetables;
DROP POLICY IF EXISTS "Staff can view all timetables" ON timetables;
DROP POLICY IF EXISTS "Students can view their timetables" ON timetables;

CREATE POLICY "Staff can manage all timetables"
ON timetables
FOR ALL
TO authenticated
USING (
  public.is_staff_admin()
  OR
  public.is_teacher()
)
WITH CHECK (
  public.is_staff_admin()
  OR
  public.is_teacher()
);

CREATE POLICY "Students can view timetables"
ON timetables
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM students s
    JOIN profiles p ON p.id = s.profile_id
    JOIN student_enrollments se ON se.student_id = s.id
    WHERE p.user_id = auth.uid()
    AND se.class_id = timetables.class_id
    AND se.status = 'active'
  )
);