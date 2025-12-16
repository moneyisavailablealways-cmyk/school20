-- Add RLS policy for parents to view their children's library transactions
CREATE POLICY "Parents can view their children's library transactions"
ON public.library_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM parent_student_relationships psr
    JOIN profiles parent_profile ON parent_profile.id = psr.parent_id
    JOIN students s ON s.id = psr.student_id
    WHERE parent_profile.user_id = auth.uid()
    AND s.profile_id = library_transactions.borrower_id
  )
);

-- Add RLS policy for parents to view their children's library fines
CREATE POLICY "Parents can view their children's library fines"
ON public.library_fines
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM parent_student_relationships psr
    JOIN profiles parent_profile ON parent_profile.id = psr.parent_id
    JOIN students s ON s.id = psr.student_id
    WHERE parent_profile.user_id = auth.uid()
    AND s.profile_id = library_fines.borrower_id
  )
);

-- Add RLS policy for parents to view their children's library reservations
CREATE POLICY "Parents can view their children's library reservations"
ON public.library_reservations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM parent_student_relationships psr
    JOIN profiles parent_profile ON parent_profile.id = psr.parent_id
    JOIN students s ON s.id = psr.student_id
    WHERE parent_profile.user_id = auth.uid()
    AND s.profile_id = library_reservations.reserver_id
  )
);