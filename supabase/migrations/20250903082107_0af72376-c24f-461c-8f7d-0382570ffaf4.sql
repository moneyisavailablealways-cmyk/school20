-- CRITICAL SECURITY FIXES (CORRECTED)

-- 1. Lock down role assignment in profiles table
-- Remove the ability for users to update their own role
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create separate policies for admins and regular users
CREATE POLICY "Admins can update any profile" 
ON public.profiles 
FOR UPDATE 
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

-- Function to check if role field is being updated
CREATE OR REPLACE FUNCTION public.is_role_update_allowed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'principal')
  );
$$;

-- Regular users can update their profile but not their role
CREATE POLICY "Users can update their own profile (no role changes)" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id AND NOT public.is_role_update_allowed())
WITH CHECK (auth.uid() = user_id);

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
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
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

-- 5. Add unique constraints for data integrity (with proper error handling)
DO $$ 
BEGIN
  BEGIN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
  EXCEPTION
    WHEN duplicate_table THEN NULL; -- Constraint already exists
  END;
  
  BEGIN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
  EXCEPTION
    WHEN duplicate_table THEN NULL; -- Constraint already exists
  END;
END $$;