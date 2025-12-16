-- Allow parents to view classes their children are enrolled in
CREATE POLICY "Parents can view their children's classes"
ON public.classes FOR SELECT
USING (
  id IN (
    SELECT se.class_id 
    FROM student_enrollments se
    JOIN parent_student_relationships psr ON psr.student_id = se.student_id
    JOIN profiles p ON p.id = psr.parent_id
    WHERE p.user_id = auth.uid()
  )
);

-- Allow parents to view streams their children are enrolled in
CREATE POLICY "Parents can view their children's streams"
ON public.streams FOR SELECT
USING (
  id IN (
    SELECT se.stream_id 
    FROM student_enrollments se
    JOIN parent_student_relationships psr ON psr.student_id = se.student_id
    JOIN profiles p ON p.id = psr.parent_id
    WHERE p.user_id = auth.uid()
  )
);