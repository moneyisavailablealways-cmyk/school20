CREATE POLICY "Bursars can view classes"
ON public.classes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'bursar'::user_role
  )
);