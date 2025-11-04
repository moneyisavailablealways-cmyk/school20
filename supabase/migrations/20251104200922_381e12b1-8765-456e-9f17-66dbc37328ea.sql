-- Enable RLS on timetables table if not already enabled
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can view their class timetables" ON timetables;
DROP POLICY IF EXISTS "Staff can manage timetables" ON timetables;
DROP POLICY IF EXISTS "Students can view teacher profiles" ON teachers;
DROP POLICY IF EXISTS "Staff can manage teachers" ON teachers;

-- Allow students to view timetables for their enrolled class
CREATE POLICY "Students can view their class timetables"
ON timetables
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM student_enrollments se
    JOIN students s ON s.id = se.student_id
    JOIN profiles p ON p.id = s.profile_id
    WHERE p.user_id = auth.uid()
    AND se.class_id = timetables.class_id
    AND se.status = 'active'
  )
);

-- Allow staff to manage all timetables
CREATE POLICY "Staff can manage timetables"
ON timetables
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'principal', 'head_teacher', 'teacher')
  )
);

-- Enable RLS on teachers table if not already enabled
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- Allow students to view teacher information for their classes
CREATE POLICY "Students can view teacher profiles"
ON teachers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'student'
  )
);

-- Allow staff to manage teacher records
CREATE POLICY "Staff can manage teachers"
ON teachers
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'principal', 'head_teacher')
  )
);