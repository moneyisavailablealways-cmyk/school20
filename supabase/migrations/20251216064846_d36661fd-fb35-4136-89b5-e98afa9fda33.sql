-- Add RLS policy for bursar to view students
CREATE POLICY "Bursar can view students for invoicing"
ON public.students
FOR SELECT
USING (is_bursar_user());