-- Fix the security warnings by adding proper search_path to the functions
DROP FUNCTION IF EXISTS public.delete_academic_year(UUID);
DROP FUNCTION IF EXISTS public.delete_level(UUID);
DROP FUNCTION IF EXISTS public.delete_class(UUID);
DROP FUNCTION IF EXISTS public.delete_stream(UUID);

-- Recreate functions with proper search_path
CREATE OR REPLACE FUNCTION public.delete_academic_year(year_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.delete_level(level_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.delete_class(class_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.delete_stream(stream_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;