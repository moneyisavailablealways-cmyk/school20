-- Drop the problematic policy
DROP POLICY IF EXISTS "Bursar can view student profiles for invoicing" ON public.profiles;

-- Create a helper function to check if user is bursar
CREATE OR REPLACE FUNCTION public.is_bursar_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role IN ('bursar', 'admin', 'principal')
  );
$$;

-- Recreate the policy using the helper function
CREATE POLICY "Bursar can view student profiles for invoicing"
ON public.profiles
FOR SELECT
USING (is_bursar_user());