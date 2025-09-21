-- Fix the delete_level function to resolve ambiguous column reference
CREATE OR REPLACE FUNCTION public.delete_level(p_level_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if there are any classes using this level
  IF EXISTS (SELECT 1 FROM public.classes WHERE classes.level_id = p_level_id) THEN
    RAISE EXCEPTION 'Cannot delete level: it is referenced by existing classes';
  END IF;
  
  -- Check if there are any child levels
  IF EXISTS (SELECT 1 FROM public.levels WHERE levels.parent_id = p_level_id) THEN
    RAISE EXCEPTION 'Cannot delete level: it has child levels';
  END IF;
  
  DELETE FROM public.levels WHERE levels.id = p_level_id;
  
  PERFORM public.log_activity(
    'level_deleted',
    'Academic level deleted',
    auth.uid(),
    jsonb_build_object('level_id', p_level_id)
  );
  
  RETURN TRUE;
END;
$function$