-- Fix the log_subject_changes function to use correct field names
CREATE OR REPLACE FUNCTION public.log_subject_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity(
      'subject_created',
      'New subject created: ' || NEW.name,
      auth.uid(),
      jsonb_build_object('subject_id', NEW.id, 'level_id', NEW.level_id, 'is_core', NEW.is_core)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_activity(
      'subject_updated',
      'Subject updated: ' || NEW.name,
      auth.uid(),
      jsonb_build_object('subject_id', NEW.id, 'changes', jsonb_build_object('is_active', NEW.is_active, 'level_id', NEW.level_id, 'sub_level', NEW.sub_level))
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_activity(
      'subject_deleted',
      'Subject deleted: ' || OLD.name,
      auth.uid(),
      jsonb_build_object('subject_id', OLD.id)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;