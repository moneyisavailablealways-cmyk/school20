-- Fix the recursive RLS policy on student_enrollments using security definer functions

-- Drop existing policies
DROP POLICY IF EXISTS "Teachers can view their students" ON student_enrollments;
DROP POLICY IF EXISTS "Teachers can view enrollments" ON student_enrollments;
DROP POLICY IF EXISTS "Allow authenticated users to view enrollments" ON student_enrollments;

-- Create security definer function to check if user is admin/principal/head_teacher
CREATE OR REPLACE FUNCTION public.is_staff_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'principal', 'head_teacher')
  );
$$;

-- Create security definer function to check if user is a teacher
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'teacher'
  );
$$;

-- Create security definer function to check if teacher can view enrollment
CREATE OR REPLACE FUNCTION public.teacher_can_view_enrollment(enrollment_class_id uuid, enrollment_stream_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  teacher_profile_id uuid;
BEGIN
  -- Get the teacher's profile ID
  SELECT id INTO teacher_profile_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  AND role = 'teacher';
  
  IF teacher_profile_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if teacher is class teacher for this class
  IF EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = enrollment_class_id
    AND c.class_teacher_id = teacher_profile_id
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if teacher is section teacher for this stream
  IF enrollment_stream_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.streams s
    WHERE s.id = enrollment_stream_id
    AND s.section_teacher_id = teacher_profile_id
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Create new RLS policy without recursion
CREATE POLICY "Users can view enrollments"
ON student_enrollments
FOR SELECT
TO authenticated
USING (
  -- Admins, principals, head teachers can view all
  public.is_staff_admin()
  OR
  -- Teachers can view enrollments for their classes/streams
  (public.is_teacher() AND public.teacher_can_view_enrollment(class_id, stream_id))
  OR
  -- Students can view their own enrollments
  EXISTS (
    SELECT 1 FROM students s
    JOIN profiles p ON p.id = s.profile_id
    WHERE p.user_id = auth.uid()
    AND s.id = student_enrollments.student_id
  )
  OR
  -- Parents can view their children's enrollments
  EXISTS (
    SELECT 1 FROM parent_student_relationships psr
    JOIN profiles p ON p.id = psr.parent_id
    WHERE p.user_id = auth.uid()
    AND psr.student_id = student_enrollments.student_id
  )
);