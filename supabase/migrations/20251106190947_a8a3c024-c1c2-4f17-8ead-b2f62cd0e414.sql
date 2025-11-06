-- Add RLS policy to allow teachers to view student profiles in their classes
CREATE POLICY "Teachers can view student profiles in their classes"
ON profiles FOR SELECT
USING (
  -- Allow if the profile belongs to a student enrolled in a class where the requesting user is the class teacher
  id IN (
    SELECT s.profile_id
    FROM students s
    INNER JOIN student_enrollments se ON s.id = se.student_id
    INNER JOIN classes c ON se.class_id = c.id
    INNER JOIN profiles p ON p.id = c.class_teacher_id
    WHERE p.user_id = auth.uid()
    AND se.status = 'active'
  )
);