-- Add RLS policy to allow parents to view their children's enrollments
CREATE POLICY "Parents can view children enrollments"
ON student_enrollments
FOR SELECT
USING (
  student_id IN (
    SELECT psr.student_id
    FROM parent_student_relationships psr
    INNER JOIN profiles p ON p.id = psr.parent_id
    WHERE p.user_id = auth.uid()
  )
);