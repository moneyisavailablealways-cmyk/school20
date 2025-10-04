-- Fix the log_enrollment_changes trigger to use stream_id instead of section_id
CREATE OR REPLACE FUNCTION public.log_enrollment_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  student_profile RECORD;
  class_rec RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT p.first_name, p.last_name INTO student_profile
    FROM public.students s JOIN public.profiles p ON p.id = s.profile_id
    WHERE s.id = NEW.student_id;

    SELECT c.name INTO class_rec FROM public.classes c WHERE c.id = NEW.class_id;

    PERFORM public.log_activity(
      'enrollment_created',
      'Enrollment created for ' || COALESCE(student_profile.first_name || ' ' || student_profile.last_name, 'student') ||
      COALESCE(' in ' || class_rec.name, ''),
      auth.uid(),
      jsonb_build_object('student_id', NEW.student_id, 'class_id', NEW.class_id, 'stream_id', NEW.stream_id)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_activity(
      'enrollment_updated',
      'Enrollment updated for student ID: ' || NEW.student_id::text,
      auth.uid(),
      jsonb_build_object('student_id', NEW.student_id, 'class_id', NEW.class_id, 'stream_id', NEW.stream_id, 'status', NEW.status)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_activity(
      'enrollment_deleted',
      'Enrollment deleted for student ID: ' || OLD.student_id::text,
      auth.uid(),
      jsonb_build_object('student_id', OLD.student_id, 'class_id', OLD.class_id)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;