-- Remove duplicate entries from levels table, keeping only one of each name
DELETE FROM public.levels 
WHERE id NOT IN (
    SELECT MIN(id) 
    FROM public.levels 
    GROUP BY name
);

-- Add unique constraint to levels table name column
ALTER TABLE public.levels ADD CONSTRAINT levels_name_unique UNIQUE (name);

-- Insert required levels data (will be ignored if already exists due to unique constraint)
INSERT INTO public.levels (name) VALUES 
  ('Nursery'),
  ('Primary'),
  ('Secondary'),
  ('College'),
  ('University')
ON CONFLICT (name) DO NOTHING;

-- Add new columns to subjects table
ALTER TABLE public.subjects 
ADD COLUMN IF NOT EXISTS level_id UUID,
ADD COLUMN IF NOT EXISTS sub_level TEXT;

-- Add foreign key constraint linking subjects to levels
ALTER TABLE public.subjects 
ADD CONSTRAINT fk_subjects_level_id 
FOREIGN KEY (level_id) REFERENCES public.levels(id) ON DELETE SET NULL;

-- Add check constraint for sub_level values
ALTER TABLE public.subjects 
ADD CONSTRAINT chk_subjects_sub_level 
CHECK (sub_level IS NULL OR sub_level IN ('O Level', 'A Level', 'All Levels'));

-- Drop the credits column if it exists
ALTER TABLE public.subjects DROP COLUMN IF EXISTS credits;

-- Drop the old level column (integer) if it exists  
ALTER TABLE public.subjects DROP COLUMN IF EXISTS level;