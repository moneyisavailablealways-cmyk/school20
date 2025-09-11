-- Separate sensitive student information into protected tables (corrected)

-- Create student medical information table
CREATE TABLE public.student_medical_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  medical_conditions TEXT,
  allergies TEXT,
  medications TEXT,
  dietary_requirements TEXT,
  special_needs TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student emergency contacts table
CREATE TABLE public.student_emergency_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_relationship TEXT,
  is_primary_contact BOOLEAN DEFAULT false,
  can_pickup BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.student_medical_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Medical information policies (only authorized personnel: admin, principal)
CREATE POLICY "Authorized personnel can manage medical info"
ON public.student_medical_info
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = ANY (ARRAY['admin'::user_role, 'principal'::user_role])
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = ANY (ARRAY['admin'::user_role, 'principal'::user_role])
));

-- Parents can view their children's medical info
CREATE POLICY "Parents can view their children's medical info"
ON public.student_medical_info
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM parent_student_relationships psr
  JOIN profiles p ON p.id = psr.parent_id
  WHERE p.user_id = auth.uid() AND psr.student_id = student_medical_info.student_id
));

-- Emergency contact policies (safety personnel: admin, principal, head_teacher for management)
CREATE POLICY "Safety personnel can manage emergency contacts"
ON public.student_emergency_contacts
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = ANY (ARRAY['admin'::user_role, 'principal'::user_role, 'head_teacher'::user_role])
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = ANY (ARRAY['admin'::user_role, 'principal'::user_role, 'head_teacher'::user_role])
));

-- Teachers can view emergency contacts (for safety purposes only)
CREATE POLICY "Teachers can view emergency contacts"
ON public.student_emergency_contacts
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = ANY (ARRAY['admin'::user_role, 'principal'::user_role, 'head_teacher'::user_role, 'teacher'::user_role])
));

-- Parents can view their children's emergency contacts
CREATE POLICY "Parents can view their children's emergency contacts"
ON public.student_emergency_contacts
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM parent_student_relationships psr
  JOIN profiles p ON p.id = psr.parent_id
  WHERE p.user_id = auth.uid() AND psr.student_id = student_emergency_contacts.student_id
));

-- Migrate existing data from students table
INSERT INTO public.student_medical_info (student_id, medical_conditions)
SELECT id, medical_conditions 
FROM public.students 
WHERE medical_conditions IS NOT NULL AND medical_conditions != '';

INSERT INTO public.student_emergency_contacts (student_id, contact_name, contact_phone, is_primary_contact)
SELECT id, emergency_contact_name, emergency_contact_phone, true
FROM public.students 
WHERE emergency_contact_name IS NOT NULL AND emergency_contact_name != '';

-- Remove sensitive columns from students table (this will require code updates)
ALTER TABLE public.students DROP COLUMN IF EXISTS medical_conditions;
ALTER TABLE public.students DROP COLUMN IF EXISTS emergency_contact_name;
ALTER TABLE public.students DROP COLUMN IF EXISTS emergency_contact_phone;

-- Add updated_at triggers for new tables
CREATE TRIGGER update_student_medical_info_updated_at
BEFORE UPDATE ON public.student_medical_info
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_emergency_contacts_updated_at
BEFORE UPDATE ON public.student_emergency_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();