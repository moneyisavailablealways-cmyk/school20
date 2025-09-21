-- Recreate all delete functions with proper signatures
DROP FUNCTION IF EXISTS public.delete_level(uuid);
DROP FUNCTION IF EXISTS public.delete_academic_year(uuid);
DROP FUNCTION IF EXISTS public.delete_class(uuid);
DROP FUNCTION IF EXISTS public.delete_stream(uuid);

-- Recreate delete_level function
CREATE OR REPLACE FUNCTION public.delete_level(level_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if there are any classes using this level
  IF EXISTS (SELECT 1 FROM classes WHERE classes.level_id = delete_level.level_id) THEN
    RAISE EXCEPTION 'Cannot delete level: it is referenced by existing classes';
  END IF;
  
  -- Check if there are any child levels
  IF EXISTS (SELECT 1 FROM levels WHERE levels.parent_id = delete_level.level_id) THEN
    RAISE EXCEPTION 'Cannot delete level: it has child levels';
  END IF;
  
  DELETE FROM levels WHERE levels.id = delete_level.level_id;
  
  PERFORM log_activity(
    'level_deleted',
    'Academic level deleted',
    auth.uid(),
    jsonb_build_object('level_id', delete_level.level_id)
  );
  
  RETURN TRUE;
END;
$function$;

-- Recreate delete_academic_year function
CREATE OR REPLACE FUNCTION public.delete_academic_year(year_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if there are any classes using this academic year
  IF EXISTS (SELECT 1 FROM classes WHERE classes.academic_year_id = delete_academic_year.year_id) THEN
    RAISE EXCEPTION 'Cannot delete academic year: it is referenced by existing classes';
  END IF;
  
  DELETE FROM academic_years WHERE academic_years.id = delete_academic_year.year_id;
  
  PERFORM log_activity(
    'academic_year_deleted',
    'Academic year deleted',
    auth.uid(),
    jsonb_build_object('year_id', delete_academic_year.year_id)
  );
  
  RETURN TRUE;
END;
$function$;

-- Recreate delete_class function
CREATE OR REPLACE FUNCTION public.delete_class(class_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if there are any streams using this class
  IF EXISTS (SELECT 1 FROM streams WHERE streams.class_id = delete_class.class_id) THEN
    RAISE EXCEPTION 'Cannot delete class: it has streams';
  END IF;
  
  -- Check if there are any student enrollments
  IF EXISTS (SELECT 1 FROM student_enrollments WHERE student_enrollments.class_id = delete_class.class_id) THEN
    RAISE EXCEPTION 'Cannot delete class: it has student enrollments';
  END IF;
  
  DELETE FROM classes WHERE classes.id = delete_class.class_id;
  
  PERFORM log_activity(
    'class_deleted',
    'Class deleted',
    auth.uid(),
    jsonb_build_object('class_id', delete_class.class_id)
  );
  
  RETURN TRUE;
END;
$function$;

-- Recreate delete_stream function
CREATE OR REPLACE FUNCTION public.delete_stream(stream_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if there are any student enrollments
  IF EXISTS (SELECT 1 FROM student_enrollments WHERE student_enrollments.stream_id = delete_stream.stream_id) THEN
    RAISE EXCEPTION 'Cannot delete stream: it has student enrollments';
  END IF;
  
  DELETE FROM streams WHERE streams.id = delete_stream.stream_id;
  
  PERFORM log_activity(
    'stream_deleted',
    'Stream deleted',
    auth.uid(),
    jsonb_build_object('stream_id', delete_stream.stream_id)
  );
  
  RETURN TRUE;
END;
$function$;