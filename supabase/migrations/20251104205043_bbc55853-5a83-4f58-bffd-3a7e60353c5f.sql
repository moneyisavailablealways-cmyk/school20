-- Update the RLS policy for students to allow teachers to view students in their assigned classes
DROP POLICY IF EXISTS "Teachers can view their students" ON students;

CREATE POLICY "Teachers can view their students"
ON students
FOR SELECT
TO authenticated
USING (
  -- Allow admins and principals to view all students
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('admin', 'principal', 'head_teacher')
  )
  OR
  -- Allow teachers to view students in classes they teach
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.role = 'teacher'
    AND (
      -- Students in classes where teacher is class teacher
      EXISTS (
        SELECT 1 FROM student_enrollments se
        JOIN classes c ON c.id = se.class_id
        WHERE se.student_id = students.id
        AND c.class_teacher_id = p.id
        AND se.status = 'active'
      )
      OR
      -- Students in streams where teacher is section teacher
      EXISTS (
        SELECT 1 FROM student_enrollments se
        JOIN streams s ON s.id = se.stream_id
        WHERE se.student_id = students.id
        AND s.section_teacher_id = p.id
        AND se.status = 'active'
      )
      OR
      -- Students enrolled in subjects the teacher teaches
      EXISTS (
        SELECT 1 FROM student_subject_enrollments sse
        JOIN teacher_specializations ts ON ts.subject_id = sse.subject_id
        JOIN teachers t ON t.id = ts.teacher_id
        WHERE sse.student_id = students.id
        AND t.profile_id = p.id
        AND sse.status = 'active'
      )
    )
  )
);