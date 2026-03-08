-- Add unique constraint for upsert to work on generated_reports
ALTER TABLE public.generated_reports
ADD CONSTRAINT generated_reports_student_year_term_unique
UNIQUE (student_id, academic_year_id, term);