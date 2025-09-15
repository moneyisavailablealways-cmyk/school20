-- Fix the classes table by removing the old level column and ensuring proper data integrity
-- First, update any classes that still use the old level column to use level_id instead

-- Update classes to use proper level_id based on the old level integer values
-- This maps old integer levels to the new level_id UUIDs
UPDATE public.classes 
SET level_id = CASE 
  WHEN level = 1 AND level_id IS NULL THEN (SELECT id FROM public.levels WHERE name = 'Nursery' AND parent_id IS NULL LIMIT 1)
  WHEN level = 2 AND level_id IS NULL THEN (SELECT id FROM public.levels WHERE name = 'Primary' AND parent_id IS NULL LIMIT 1)
  WHEN level >= 3 AND level <= 6 AND level_id IS NULL THEN (SELECT id FROM public.levels WHERE name = 'O Level' LIMIT 1)
  WHEN level >= 7 AND level <= 12 AND level_id IS NULL THEN (SELECT id FROM public.levels WHERE name = 'A Level' LIMIT 1)
  ELSE level_id
END
WHERE level_id IS NULL;

-- Now drop the old level column since we're using level_id
ALTER TABLE public.classes DROP COLUMN IF EXISTS level;

-- Add a foreign key constraint to ensure data integrity
ALTER TABLE public.classes 
ADD CONSTRAINT fk_classes_level_id 
FOREIGN KEY (level_id) REFERENCES public.levels(id) ON DELETE SET NULL;

-- Add delete functions for all entities with proper logging
CREATE OR REPLACE FUNCTION public.delete_academic_year(year_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if there are any classes using this academic year
  IF EXISTS (SELECT 1 FROM public.classes WHERE academic_year_id = year_id) THEN
    RAISE EXCEPTION 'Cannot delete academic year: it is referenced by existing classes';
  END IF;
  
  DELETE FROM public.academic_years WHERE id = year_id;
  
  PERFORM public.log_activity(
    'academic_year_deleted',
    'Academic year deleted',
    auth.uid(),
    jsonb_build_object('year_id', year_id)
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_level(level_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if there are any classes using this level
  IF EXISTS (SELECT 1 FROM public.classes WHERE level_id = level_id) THEN
    RAISE EXCEPTION 'Cannot delete level: it is referenced by existing classes';
  END IF;
  
  -- Check if there are any child levels
  IF EXISTS (SELECT 1 FROM public.levels WHERE parent_id = level_id) THEN
    RAISE EXCEPTION 'Cannot delete level: it has child levels';
  END IF;
  
  DELETE FROM public.levels WHERE id = level_id;
  
  PERFORM public.log_activity(
    'level_deleted',
    'Academic level deleted',
    auth.uid(),
    jsonb_build_object('level_id', level_id)
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_class(class_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if there are any streams using this class
  IF EXISTS (SELECT 1 FROM public.streams WHERE class_id = class_id) THEN
    RAISE EXCEPTION 'Cannot delete class: it has streams';
  END IF;
  
  -- Check if there are any student enrollments
  IF EXISTS (SELECT 1 FROM public.student_enrollments WHERE class_id = class_id) THEN
    RAISE EXCEPTION 'Cannot delete class: it has student enrollments';
  END IF;
  
  DELETE FROM public.classes WHERE id = class_id;
  
  PERFORM public.log_activity(
    'class_deleted',
    'Class deleted',
    auth.uid(),
    jsonb_build_object('class_id', class_id)
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_stream(stream_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if there are any student enrollments
  IF EXISTS (SELECT 1 FROM public.student_enrollments WHERE stream_id = stream_id) THEN
    RAISE EXCEPTION 'Cannot delete stream: it has student enrollments';
  END IF;
  
  DELETE FROM public.streams WHERE id = stream_id;
  
  PERFORM public.log_activity(
    'stream_deleted',
    'Stream deleted',
    auth.uid(),
    jsonb_build_object('stream_id', stream_id)
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;