-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Bursar can view student profiles" ON public.profiles;

-- Recreate using the security definer function to avoid recursion
CREATE POLICY "Bursar can view student profiles" 
ON public.profiles 
FOR SELECT 
USING (
  is_bursar_user() AND 
  EXISTS (
    SELECT 1 FROM students s WHERE s.profile_id = profiles.id
  )
);