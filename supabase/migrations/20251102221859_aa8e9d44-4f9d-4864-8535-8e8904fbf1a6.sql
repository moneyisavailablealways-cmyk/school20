-- Allow students to view their own class enrollments
CREATE POLICY "Students can view their own enrollments"
ON student_enrollments
FOR SELECT
USING (
  student_id IN (
    SELECT id FROM students
    WHERE profile_id = (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
);