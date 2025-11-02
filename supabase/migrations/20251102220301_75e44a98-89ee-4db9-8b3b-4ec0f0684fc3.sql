
-- Add RLS policy to allow students to view their own record
CREATE POLICY "Students can view their own record"
ON students
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.id = students.profile_id
    AND profiles.role = 'student'
  )
);
