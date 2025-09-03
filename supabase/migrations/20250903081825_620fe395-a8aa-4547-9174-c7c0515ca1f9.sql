-- CRITICAL SECURITY FIXES - CORRECTED VERSION

-- 1. Lock down role assignment in profiles table
-- Remove the problematic policy first
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a simpler policy that prevents role updates entirely for non-admins
CREATE POLICY "Users can update their own profile (no role changes)" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND 
  -- Only admins can change roles, others cannot
  (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'principal')
  ) OR NOT EXISTS (
    SELECT 1 FROM public.profiles p2
    WHERE p2.user_id = auth.uid() 
    AND p2.role != profiles.role
  ))
);

-- 2. Add the missing handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    'student'::user_role  -- Always default to student role for security
  );
  RETURN NEW;
END;
$$;

-- Create the trigger (only if it doesn't exist)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Restrict announcements access - remove overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can read announcements" ON public.announcements;

-- 4. Restrict library items access - make them require authentication
DROP POLICY IF EXISTS "Everyone can view active library items" ON public.library_items;

-- Create new policy requiring authentication for library items
CREATE POLICY "Authenticated users can view active library items" 
ON public.library_items 
FOR SELECT 
USING (is_active = true AND auth.uid() IS NOT NULL);

-- 5. Add unique constraints for data integrity (ignore if they already exist)
DO $$
BEGIN
    BEGIN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
    EXCEPTION
        WHEN duplicate_table THEN
            -- Constraint already exists, ignore
    END;
    
    BEGIN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
    EXCEPTION
        WHEN duplicate_table THEN
            -- Constraint already exists, ignore
    END;
END $$;

-- 6. Update the admin check function
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'principal')
  );
$$;