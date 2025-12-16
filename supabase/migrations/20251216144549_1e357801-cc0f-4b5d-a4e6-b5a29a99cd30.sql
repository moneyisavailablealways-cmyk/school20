-- Add missing fields to students table for report card
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS section text DEFAULT 'day',
ADD COLUMN IF NOT EXISTS house text,
ADD COLUMN IF NOT EXISTS photo_url text;

-- Add assessment breakdown fields to subject_submissions
ALTER TABLE public.subject_submissions
ADD COLUMN IF NOT EXISTS a1_score numeric,
ADD COLUMN IF NOT EXISTS a2_score numeric,
ADD COLUMN IF NOT EXISTS a3_score numeric,
ADD COLUMN IF NOT EXISTS exam_score numeric,
ADD COLUMN IF NOT EXISTS identifier integer DEFAULT 2;

-- Create term_configurations table
CREATE TABLE IF NOT EXISTS public.term_configurations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  academic_year_id uuid REFERENCES public.academic_years(id),
  term_name text NOT NULL,
  term_number integer NOT NULL DEFAULT 1,
  start_date date NOT NULL,
  end_date date NOT NULL,
  next_term_start_date date,
  fees_balance_note text,
  fees_next_term text,
  other_requirements text,
  is_current boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(academic_year_id, term_number)
);

-- Enable RLS on term_configurations
ALTER TABLE public.term_configurations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for term_configurations
CREATE POLICY "Staff can view term configurations" ON public.term_configurations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'principal', 'head_teacher', 'teacher'))
  );

CREATE POLICY "Admins can manage term configurations" ON public.term_configurations
  FOR ALL USING (is_admin_or_principal());

-- Add footer motto to school_settings
ALTER TABLE public.school_settings
ADD COLUMN IF NOT EXISTS footer_motto text DEFAULT 'Work hard to excel',
ADD COLUMN IF NOT EXISTS term_assessment_label text DEFAULT 'Average Chapter Assessment',
ADD COLUMN IF NOT EXISTS exam_label text DEFAULT 'End of term assessment';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_term_configurations_academic_year ON public.term_configurations(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_term_configurations_current ON public.term_configurations(is_current) WHERE is_current = true;

-- Create trigger for updated_at
CREATE TRIGGER update_term_configurations_updated_at
  BEFORE UPDATE ON public.term_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();