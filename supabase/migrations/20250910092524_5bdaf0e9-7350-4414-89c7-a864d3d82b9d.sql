-- Attach triggers to log changes and add missing logging functions

-- 1) Ensure activity log function exists (already present in project)
--    Create triggers on profiles and students to use existing logging functions
DROP TRIGGER IF EXISTS tr_log_profile_changes ON public.profiles;
CREATE TRIGGER tr_log_profile_changes
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_profile_changes();

DROP TRIGGER IF EXISTS tr_log_student_changes ON public.students;
CREATE TRIGGER tr_log_student_changes
AFTER INSERT OR UPDATE OR DELETE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.log_student_changes();

-- 2) Create subject logging function and trigger
CREATE OR REPLACE FUNCTION public.log_subject_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity(
      'subject_created',
      'New subject created: ' || NEW.name,
      auth.uid(),
      jsonb_build_object('subject_id', NEW.id, 'level', NEW.level, 'is_core', NEW.is_core)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_activity(
      'subject_updated',
      'Subject updated: ' || NEW.name,
      auth.uid(),
      jsonb_build_object('subject_id', NEW.id, 'changes', jsonb_build_object('is_active', NEW.is_active, 'credits', NEW.credits, 'level', NEW.level))
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
$$;

DROP TRIGGER IF EXISTS tr_log_subject_changes ON public.subjects;
CREATE TRIGGER tr_log_subject_changes
AFTER INSERT OR UPDATE OR DELETE ON public.subjects
FOR EACH ROW EXECUTE FUNCTION public.log_subject_changes();

-- 3) Create enrollment logging function and trigger
CREATE OR REPLACE FUNCTION public.log_enrollment_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
      jsonb_build_object('student_id', NEW.student_id, 'class_id', NEW.class_id, 'section_id', NEW.section_id)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_activity(
      'enrollment_updated',
      'Enrollment updated for student ID: ' || NEW.student_id::text,
      auth.uid(),
      jsonb_build_object('student_id', NEW.student_id, 'class_id', NEW.class_id, 'status', NEW.status)
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
$$;

DROP TRIGGER IF EXISTS tr_log_enrollment_changes ON public.student_enrollments;
CREATE TRIGGER tr_log_enrollment_changes
AFTER INSERT OR UPDATE OR DELETE ON public.student_enrollments
FOR EACH ROW EXECUTE FUNCTION public.log_enrollment_changes();

-- 4) Helpful index on activity type for filtering
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_activity_log_type_created_at'
  ) THEN
    CREATE INDEX idx_activity_log_type_created_at ON public.activity_log(activity_type, created_at DESC);
  END IF;
END $$;