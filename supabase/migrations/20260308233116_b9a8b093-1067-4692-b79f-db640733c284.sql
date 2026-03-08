-- Drop the global unique constraint on code and replace with per-school unique
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS subjects_code_school_unique ON public.subjects (code, school_id) WHERE code IS NOT NULL;