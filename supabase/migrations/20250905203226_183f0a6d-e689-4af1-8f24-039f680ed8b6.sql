-- Create teacher subject specializations table
CREATE TABLE IF NOT EXISTS public.teacher_subject_specializations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(teacher_id, subject_id)
);

-- Enable RLS
ALTER TABLE public.teacher_subject_specializations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can manage teacher specializations" 
ON public.teacher_subject_specializations 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('admin', 'principal', 'head_teacher')
));

CREATE POLICY "Teachers can view their own specializations" 
ON public.teacher_subject_specializations 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND id = teacher_subject_specializations.teacher_id
));

-- Create teacher class assignments table
CREATE TABLE IF NOT EXISTS public.teacher_class_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(teacher_id, subject_id, class_id, academic_year_id)
);

-- Enable RLS
ALTER TABLE public.teacher_class_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can manage teacher class assignments" 
ON public.teacher_class_assignments 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('admin', 'principal', 'head_teacher')
));

CREATE POLICY "Teachers can view their assignments" 
ON public.teacher_class_assignments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND id = teacher_class_assignments.teacher_id
));

-- Create activity log table for dashboard
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Staff can view activity log" 
ON public.activity_log 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('admin', 'principal', 'head_teacher', 'teacher', 'bursar')
));

CREATE POLICY "System can insert activity log" 
ON public.activity_log 
FOR INSERT 
WITH CHECK (true);

-- Create function to log activities
CREATE OR REPLACE FUNCTION public.log_activity(
  p_activity_type TEXT,
  p_description TEXT,
  p_user_id UUID DEFAULT auth.uid(),
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO public.activity_log (activity_type, description, user_id, metadata)
  VALUES (p_activity_type, p_description, p_user_id, p_metadata)
  RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$;

-- Add triggers for activity logging
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity(
      'user_created',
      'New user account created: ' || NEW.first_name || ' ' || NEW.last_name,
      NEW.user_id,
      jsonb_build_object('profile_id', NEW.id, 'role', NEW.role)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role != NEW.role THEN
      PERFORM public.log_activity(
        'role_changed',
        'User role changed from ' || OLD.role || ' to ' || NEW.role || ': ' || NEW.first_name || ' ' || NEW.last_name,
        NEW.user_id,
        jsonb_build_object('profile_id', NEW.id, 'old_role', OLD.role, 'new_role', NEW.role)
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_activity(
      'user_deleted',
      'User account deleted: ' || OLD.first_name || ' ' || OLD.last_name,
      OLD.user_id,
      jsonb_build_object('profile_id', OLD.id, 'role', OLD.role)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER profile_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_profile_changes();

CREATE OR REPLACE FUNCTION public.log_student_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_data RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT first_name, last_name INTO profile_data
    FROM public.profiles WHERE id = NEW.profile_id;
    
    PERFORM public.log_activity(
      'student_enrolled',
      'New student enrolled: ' || profile_data.first_name || ' ' || profile_data.last_name,
      auth.uid(),
      jsonb_build_object('student_id', NEW.id, 'student_number', NEW.student_id)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT first_name, last_name INTO profile_data
    FROM public.profiles WHERE id = NEW.profile_id;
    
    IF OLD.enrollment_status != NEW.enrollment_status THEN
      PERFORM public.log_activity(
        'student_status_changed',
        'Student status changed to ' || NEW.enrollment_status || ': ' || profile_data.first_name || ' ' || profile_data.last_name,
        auth.uid(),
        jsonb_build_object('student_id', NEW.id, 'old_status', OLD.enrollment_status, 'new_status', NEW.enrollment_status)
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT first_name, last_name INTO profile_data
    FROM public.profiles WHERE id = OLD.profile_id;
    
    PERFORM public.log_activity(
      'student_deleted',
      'Student record deleted: ' || profile_data.first_name || ' ' || profile_data.last_name,
      auth.uid(),
      jsonb_build_object('student_id', OLD.id)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER student_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.log_student_changes();

-- Update triggers for updated_at columns
CREATE TRIGGER update_teacher_specializations_updated_at
  BEFORE UPDATE ON public.teacher_subject_specializations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teacher_assignments_updated_at
  BEFORE UPDATE ON public.teacher_class_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();