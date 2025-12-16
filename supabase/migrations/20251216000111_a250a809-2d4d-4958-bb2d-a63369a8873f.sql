-- Fix infinite recursion by moving recipient-check logic into a SECURITY DEFINER function
DROP POLICY IF EXISTS "Recipients can view appointment requests" ON public.appointment_requests;

CREATE OR REPLACE FUNCTION public.is_recipient_of_appointment(p_appointment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.appointment_recipients ar
    WHERE ar.appointment_id = p_appointment_id
      AND ar.recipient_id = public.get_current_profile_id()
  );
$$;

CREATE POLICY "Recipients can view appointment requests"
ON public.appointment_requests FOR SELECT
USING (public.is_recipient_of_appointment(id));