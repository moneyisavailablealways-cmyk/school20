CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
TO public
USING (is_admin_user())
WITH CHECK (is_admin_user());