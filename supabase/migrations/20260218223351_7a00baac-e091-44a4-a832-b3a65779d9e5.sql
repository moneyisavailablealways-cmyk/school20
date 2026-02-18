
-- ============================================================
-- STEP 2: Create the schools table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_name TEXT NOT NULL,
  school_code TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  country TEXT DEFAULT 'Uganda',
  region TEXT,
  timezone TEXT DEFAULT 'Africa/Kampala',
  email TEXT,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  theme_color TEXT DEFAULT '#1e40af',
  website TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  max_students INTEGER DEFAULT 1000,
  subscription_plan TEXT DEFAULT 'standard',
  admin_name TEXT,
  admin_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 3: Insert School20 Academy as the default school
-- ============================================================
INSERT INTO public.schools (
  id, school_name, school_code, slug, country, region, timezone,
  email, phone, address, website, status, admin_name, admin_email
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'School20 Academy', 'SCH20', 'school20-academy',
  'Uganda', 'Central', 'Africa/Kampala',
  'admin@school20.ac.ug', '+256705466283',
  'Kampala, Uganda', 'https://school20.lovable.app',
  'active', 'School20 Admin', 'admin@school20.ac.ug'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STEP 4: Add school_id to core tables (non-breaking)
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

ALTER TABLE public.academic_years
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

ALTER TABLE public.fee_structures
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

ALTER TABLE public.levels
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

-- ============================================================
-- STEP 5: Migrate all existing data to School20 Academy
-- ============================================================
UPDATE public.profiles SET school_id = '00000000-0000-0000-0000-000000000001' WHERE school_id IS NULL;
UPDATE public.students SET school_id = '00000000-0000-0000-0000-000000000001' WHERE school_id IS NULL;
UPDATE public.classes SET school_id = '00000000-0000-0000-0000-000000000001' WHERE school_id IS NULL;
UPDATE public.announcements SET school_id = '00000000-0000-0000-0000-000000000001' WHERE school_id IS NULL;
UPDATE public.academic_years SET school_id = '00000000-0000-0000-0000-000000000001' WHERE school_id IS NULL;
UPDATE public.fee_structures SET school_id = '00000000-0000-0000-0000-000000000001' WHERE school_id IS NULL;
UPDATE public.levels SET school_id = '00000000-0000-0000-0000-000000000001' WHERE school_id IS NULL;

-- ============================================================
-- STEP 6: RLS Policies for schools table
-- ============================================================
CREATE POLICY "School members can view their school"
  ON public.schools FOR SELECT
  USING (
    id = (SELECT school_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Super admin can manage schools"
  ON public.schools FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'super_admin'));

-- ============================================================
-- STEP 7: Helper functions
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_current_school_id()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT school_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'super_admin'
  );
$$;
