-- First, ensure the levels table has the required data
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
FOREIGN KEY (level_id) REFERENCES public.levels(id);

-- Add check constraint for sub_level values
ALTER TABLE public.subjects 
ADD CONSTRAINT chk_subjects_sub_level 
CHECK (sub_level IS NULL OR sub_level IN ('O Level', 'A Level', 'All Levels'));

-- Drop the credits column
ALTER TABLE public.subjects DROP COLUMN IF EXISTS credits;

-- Drop the old level column (integer)
ALTER TABLE public.subjects DROP COLUMN IF EXISTS level;

-- Update RLS policies for subjects to include level relationship
DROP POLICY IF EXISTS "Staff can view subjects" ON public.subjects;
CREATE POLICY "Staff can view subjects" 
ON public.subjects 
FOR SELECT 
USING (
  is_active = true AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = ANY(ARRAY['admin'::user_role, 'principal'::user_role, 'head_teacher'::user_role, 'teacher'::user_role, 'student'::user_role, 'parent'::user_role])
  )
);