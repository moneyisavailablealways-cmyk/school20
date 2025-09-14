-- Add unique constraint to levels table name column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'levels_name_unique'
    ) THEN
        ALTER TABLE public.levels ADD CONSTRAINT levels_name_unique UNIQUE (name);
    END IF;
END $$;

-- Insert required levels data
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
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_subjects_level_id'
    ) THEN
        ALTER TABLE public.subjects 
        ADD CONSTRAINT fk_subjects_level_id 
        FOREIGN KEY (level_id) REFERENCES public.levels(id);
    END IF;
END $$;

-- Add check constraint for sub_level values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_subjects_sub_level'
    ) THEN
        ALTER TABLE public.subjects 
        ADD CONSTRAINT chk_subjects_sub_level 
        CHECK (sub_level IS NULL OR sub_level IN ('O Level', 'A Level', 'All Levels'));
    END IF;
END $$;

-- Drop the credits column if it exists
ALTER TABLE public.subjects DROP COLUMN IF EXISTS credits;

-- Drop the old level column (integer) if it exists
ALTER TABLE public.subjects DROP COLUMN IF EXISTS level;