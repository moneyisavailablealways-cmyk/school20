-- Add RLS policy to allow parents to view their children's profiles
CREATE POLICY "Parents can view their children's profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.parent_student_relationships psr
    JOIN public.students s ON s.id = psr.student_id
    JOIN public.profiles p ON p.id = psr.parent_id
    WHERE p.user_id = auth.uid()
    AND s.profile_id = profiles.id
  )
);