-- Add RLS policy to allow bursar to view student profiles for invoicing
CREATE POLICY "Bursar can view student profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('bursar', 'admin', 'principal')
  )
  AND EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.profile_id = profiles.id
  )
);