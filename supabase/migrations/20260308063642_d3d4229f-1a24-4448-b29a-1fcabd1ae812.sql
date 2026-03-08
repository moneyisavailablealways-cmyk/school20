-- Allow all authenticated users to view profiles for appointment recipient selection
CREATE POLICY "Authenticated users can view profiles for appointments"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_active = true);