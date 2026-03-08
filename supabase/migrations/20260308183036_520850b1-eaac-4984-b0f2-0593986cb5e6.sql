
-- Create marks_correction_logs audit table
CREATE TABLE public.marks_correction_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID REFERENCES public.subject_submissions(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  term TEXT NOT NULL,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  previous_marks NUMERIC,
  previous_grade TEXT,
  previous_a1 NUMERIC,
  previous_a2 NUMERIC,
  previous_a3 NUMERIC,
  previous_exam_score NUMERIC,
  previous_status TEXT NOT NULL,
  reset_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marks_correction_logs ENABLE ROW LEVEL SECURITY;

-- RLS: Only admin/principal/head_teacher can view logs
CREATE POLICY "Staff can view correction logs"
  ON public.marks_correction_logs
  FOR SELECT
  TO authenticated
  USING (public.is_staff_admin());

-- RLS: Authenticated users can insert (controlled by app logic)
CREATE POLICY "Authenticated users can insert correction logs"
  ON public.marks_correction_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (reset_by = public.get_current_profile_id());

-- Index for efficient queries
CREATE INDEX idx_marks_correction_logs_student ON public.marks_correction_logs(student_id);
CREATE INDEX idx_marks_correction_logs_school ON public.marks_correction_logs(school_id);
CREATE INDEX idx_marks_correction_logs_reset_at ON public.marks_correction_logs(reset_at DESC);
