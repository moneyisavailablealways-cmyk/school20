CREATE POLICY "Bursars can view academic years"
ON public.academic_years
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'bursar'::user_role
  )
);