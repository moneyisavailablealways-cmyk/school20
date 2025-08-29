-- Create teacher_enrollments table
CREATE TABLE public.teacher_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  class_id UUID,
  subject_id UUID,
  academic_year_id UUID,
  role_type TEXT NOT NULL DEFAULT 'subject_teacher', -- 'class_teacher', 'subject_teacher', 'assistant_teacher'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'suspended'
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  workload_hours INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create parent_enrollments table
CREATE TABLE public.parent_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL,
  academic_year_id UUID,
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'pending_approval'
  contact_preferences JSONB DEFAULT '{"email": true, "sms": false, "calls": true}'::jsonb,
  emergency_contact_priority INTEGER DEFAULT 1,
  authorized_pickup BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subjects table (needed for teacher enrollments)
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  description TEXT,
  level INTEGER, -- class level this subject is for
  credits INTEGER DEFAULT 1,
  is_core BOOLEAN DEFAULT false, -- core subject vs elective
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.teacher_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teacher_enrollments
CREATE POLICY "Admins can manage teacher enrollments"
ON public.teacher_enrollments
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role IN ('admin', 'principal', 'head_teacher')
));

CREATE POLICY "Teachers can view their own enrollments"
ON public.teacher_enrollments
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.user_id = auth.uid() 
  AND profiles.id = teacher_enrollments.teacher_id
));

-- RLS Policies for parent_enrollments
CREATE POLICY "Admins can manage parent enrollments"
ON public.parent_enrollments
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role IN ('admin', 'principal')
));

CREATE POLICY "Parents can view their own enrollment"
ON public.parent_enrollments
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.user_id = auth.uid() 
  AND profiles.id = parent_enrollments.parent_id
));

CREATE POLICY "Parents can update their own enrollment"
ON public.parent_enrollments
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.user_id = auth.uid() 
  AND profiles.id = parent_enrollments.parent_id
));

-- RLS Policies for subjects
CREATE POLICY "Staff can view subjects"
ON public.subjects
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role IN ('admin', 'principal', 'head_teacher', 'teacher')
));

CREATE POLICY "Admins can manage subjects"
ON public.subjects
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role IN ('admin', 'principal', 'head_teacher')
));

-- Add foreign key constraints
ALTER TABLE public.teacher_enrollments 
ADD CONSTRAINT fk_teacher_enrollments_teacher_id 
FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.teacher_enrollments 
ADD CONSTRAINT fk_teacher_enrollments_class_id 
FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL;

ALTER TABLE public.teacher_enrollments 
ADD CONSTRAINT fk_teacher_enrollments_subject_id 
FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE SET NULL;

ALTER TABLE public.teacher_enrollments 
ADD CONSTRAINT fk_teacher_enrollments_academic_year_id 
FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL;

ALTER TABLE public.parent_enrollments 
ADD CONSTRAINT fk_parent_enrollments_parent_id 
FOREIGN KEY (parent_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.parent_enrollments 
ADD CONSTRAINT fk_parent_enrollments_academic_year_id 
FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL;

-- Add indexes for better performance
CREATE INDEX idx_teacher_enrollments_teacher_id ON public.teacher_enrollments(teacher_id);
CREATE INDEX idx_teacher_enrollments_class_id ON public.teacher_enrollments(class_id);
CREATE INDEX idx_teacher_enrollments_subject_id ON public.teacher_enrollments(subject_id);
CREATE INDEX idx_teacher_enrollments_academic_year_id ON public.teacher_enrollments(academic_year_id);
CREATE INDEX idx_parent_enrollments_parent_id ON public.parent_enrollments(parent_id);
CREATE INDEX idx_parent_enrollments_academic_year_id ON public.parent_enrollments(academic_year_id);

-- Add triggers for updating timestamps
CREATE TRIGGER update_teacher_enrollments_updated_at
BEFORE UPDATE ON public.teacher_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_parent_enrollments_updated_at
BEFORE UPDATE ON public.parent_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at
BEFORE UPDATE ON public.subjects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add unique constraints
ALTER TABLE public.teacher_enrollments 
ADD CONSTRAINT unique_teacher_class_subject_year 
UNIQUE (teacher_id, class_id, subject_id, academic_year_id);

ALTER TABLE public.parent_enrollments 
ADD CONSTRAINT unique_parent_academic_year 
UNIQUE (parent_id, academic_year_id);