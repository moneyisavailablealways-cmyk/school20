-- Create student_subject_enrollments table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.student_subject_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_student_subject_year UNIQUE (student_id, subject_id, academic_year_id)
);

-- Enable RLS
ALTER TABLE public.student_subject_enrollments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage student subject enrollments"
ON public.student_subject_enrollments
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role IN ('admin', 'principal', 'head_teacher')
));

CREATE POLICY "Teachers can view student subject enrollments"
ON public.student_subject_enrollments
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role IN ('admin', 'principal', 'head_teacher', 'teacher')
));

CREATE POLICY "Students can view their own subject enrollments"
ON public.student_subject_enrollments
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM students s
  JOIN profiles p ON p.id = s.profile_id
  WHERE p.user_id = auth.uid() 
  AND s.id = student_subject_enrollments.student_id
));

CREATE POLICY "Parents can view their children's subject enrollments"
ON public.student_subject_enrollments
FOR SELECT
USING (
  student_id IN (
    SELECT psr.student_id
    FROM parent_student_relationships psr
    INNER JOIN profiles p ON p.id = psr.parent_id
    WHERE p.user_id = auth.uid()
  )
);

-- Add indexes for performance
CREATE INDEX idx_student_subject_enrollments_student_id ON public.student_subject_enrollments(student_id);
CREATE INDEX idx_student_subject_enrollments_subject_id ON public.student_subject_enrollments(subject_id);
CREATE INDEX idx_student_subject_enrollments_academic_year_id ON public.student_subject_enrollments(academic_year_id);

-- Add trigger for updating timestamps
CREATE TRIGGER update_student_subject_enrollments_updated_at
BEFORE UPDATE ON public.student_subject_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();