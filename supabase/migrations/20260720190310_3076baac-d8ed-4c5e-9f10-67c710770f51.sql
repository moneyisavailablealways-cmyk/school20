
-- Allow admissions-created profiles that don't yet have an auth.users row
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
ALTER TABLE public.profiles ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add missing columns on students used by admissions approval
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS national_id text,
  ADD COLUMN IF NOT EXISTS birth_certificate_number text,
  ADD COLUMN IF NOT EXISTS current_class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_students_national_id ON public.students(school_id, national_id);
CREATE INDEX IF NOT EXISTS idx_students_birth_cert ON public.students(school_id, birth_certificate_number);
CREATE INDEX IF NOT EXISTS idx_students_current_class ON public.students(current_class_id);
