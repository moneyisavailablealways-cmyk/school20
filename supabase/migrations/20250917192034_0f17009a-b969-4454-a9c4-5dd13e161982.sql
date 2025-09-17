-- Fix the relationship ambiguity between classes and levels
-- The issue is that PostgREST detects multiple potential relationships due to similar column types
-- We need to create an explicit foreign key constraint to clarify the relationship

-- First, ensure data integrity by updating any null level_id values if needed
UPDATE public.classes 
SET level_id = (SELECT id FROM public.levels WHERE name = 'Primary' AND parent_id IS NULL LIMIT 1)
WHERE level_id IS NULL;

-- Drop any existing foreign key constraints that might be causing conflicts
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS fk_classes_level_id;

-- Create a single, explicit foreign key constraint from classes.level_id to levels.id
ALTER TABLE public.classes 
ADD CONSTRAINT fk_classes_level_id 
FOREIGN KEY (level_id) REFERENCES public.levels(id) ON DELETE SET NULL;

-- Add a comment to make the relationship clear
COMMENT ON CONSTRAINT fk_classes_level_id ON public.classes IS 'Links classes to their academic level';

-- Create an index for better performance on the foreign key
CREATE INDEX IF NOT EXISTS idx_classes_level_id ON public.classes(level_id);