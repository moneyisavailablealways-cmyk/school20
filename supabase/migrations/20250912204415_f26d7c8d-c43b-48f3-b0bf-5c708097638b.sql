-- Create teacher_specializations table
CREATE TABLE public.teacher_specializations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, subject_id, class_id)
);

-- Enable Row Level Security
ALTER TABLE public.teacher_specializations ENABLE ROW LEVEL SECURITY;

-- Create policies for teacher_specializations
CREATE POLICY "Admins can manage teacher specializations"
ON public.teacher_specializations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'principal', 'head_teacher')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'principal', 'head_teacher')
  )
);

CREATE POLICY "Teachers can view their own specializations"
ON public.teacher_specializations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.teachers t
    JOIN public.profiles p ON p.id = t.profile_id
    WHERE t.id = teacher_specializations.teacher_id
    AND p.user_id = auth.uid()
  )
);

-- Create trigger for updating updated_at
CREATE TRIGGER update_teacher_specializations_updated_at
  BEFORE UPDATE ON public.teacher_specializations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();