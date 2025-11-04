-- Enable RLS on students table if not already enabled
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Teachers can view their students" ON students;
DROP POLICY IF EXISTS "Teachers can view student subject enrollments" ON student_subject_enrollments;
DROP POLICY IF EXISTS "Teachers can view their specializations" ON teacher_specializations;

-- Allow teachers to view students in their classes
CREATE POLICY "Teachers can view their students"
ON students
FOR SELECT
TO authenticated
USING (
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
        JOIN teachers t ON t.profile_id = p.id
        JOIN teacher_specializations ts ON ts.teacher_id = t.id
        WHERE sse.student_id = students.id
        AND sse.subject_id = ts.subject_id
        AND sse.status = 'active'
      )
    )
  )
);

-- Allow teachers to view subject enrollments for their subjects
CREATE POLICY "Teachers can view student subject enrollments"
ON student_subject_enrollments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN teachers t ON t.profile_id = p.id
    JOIN teacher_specializations ts ON ts.teacher_id = t.id
    WHERE p.user_id = auth.uid()
    AND p.role = 'teacher'
    AND ts.subject_id = student_subject_enrollments.subject_id
  )
);

-- Allow teachers to view their own specializations
CREATE POLICY "Teachers can view their specializations"
ON teacher_specializations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teachers t
    JOIN profiles p ON p.id = t.profile_id
    WHERE p.user_id = auth.uid()
    AND t.id = teacher_specializations.teacher_id
  )
);