-- Add policy for recipients to view appointment requests sent to them
CREATE POLICY "Recipients can view appointment requests"
ON public.appointment_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.appointment_recipients ar
    WHERE ar.appointment_id = appointment_requests.id
    AND ar.recipient_id = public.get_current_profile_id()
  )
);