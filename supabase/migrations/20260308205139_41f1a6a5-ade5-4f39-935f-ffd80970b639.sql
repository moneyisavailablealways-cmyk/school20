-- Add education_level column to subjects table for level-aware filtering
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS education_level text DEFAULT 'secondary';

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_subjects_education_level ON public.subjects(education_level);

-- Update schools table: allow 'higher_institution' as a future level
-- The school_level column already exists as text, so it's flexible

-- Add a comment explaining valid values
COMMENT ON COLUMN public.schools.school_level IS 'Valid values: primary, secondary, higher_institution (future)';
COMMENT ON COLUMN public.subjects.education_level IS 'Valid values: primary, secondary, all. Determines which school levels can see this subject';