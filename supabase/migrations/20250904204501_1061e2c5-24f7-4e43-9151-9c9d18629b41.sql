-- Database updates for teacher class assignment and student class/section assignment

-- Create settings table for school configuration
CREATE TABLE IF NOT EXISTS public.school_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name text NOT NULL DEFAULT 'School Name',
  address text,
  phone text,
  email text,
  website text,
  logo_url text,
  established_year text,
  motto text,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on school_settings
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to manage school settings
CREATE POLICY "Admins can manage school settings" 
ON public.school_settings 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('admin', 'principal')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('admin', 'principal')
));

-- Create policy for staff to view school settings
CREATE POLICY "Staff can view school settings" 
ON public.school_settings 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('admin', 'principal', 'head_teacher', 'teacher', 'bursar', 'librarian')
));

-- Insert default school settings if none exist
INSERT INTO public.school_settings (school_name, motto, description)
SELECT 'School20 Academy', 'Excellence in Education', 'A premier educational institution dedicated to nurturing young minds and fostering academic excellence.'
WHERE NOT EXISTS (SELECT 1 FROM public.school_settings);

-- Update classes table to ensure proper foreign key constraint exists
-- (This already exists according to the types, but let's ensure it's proper)
ALTER TABLE public.classes 
DROP CONSTRAINT IF EXISTS classes_class_teacher_id_fkey;

ALTER TABLE public.classes 
ADD CONSTRAINT classes_class_teacher_id_fkey 
FOREIGN KEY (class_teacher_id) REFERENCES public.profiles(id) 
ON DELETE SET NULL;

-- Create a trigger to update updated_at on school_settings
CREATE OR REPLACE FUNCTION public.update_school_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_school_settings_updated_at
BEFORE UPDATE ON public.school_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_school_settings_updated_at();

-- Create storage bucket for school logo if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-assets', 'school-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for school assets
CREATE POLICY "Admins can upload school assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'school-assets' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'principal')
  )
);

CREATE POLICY "Everyone can view school assets" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'school-assets');

CREATE POLICY "Admins can delete school assets" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'school-assets' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'principal')
  )
);