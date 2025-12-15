-- Allow all authenticated users to view active profiles for recipient selection
CREATE POLICY "Authenticated users can view active profiles for appointments"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_active = true
);