
-- 1. Add DELETE policy for appointment_requests (creator only)
CREATE POLICY "Creators can delete their own appointments"
ON public.appointment_requests
FOR DELETE
TO authenticated
USING (sender_id = public.get_current_profile_id());

-- 2. Add DELETE policy for appointment_recipients (cascade handled, but allow direct delete by appointment creator)
CREATE POLICY "Appointment creator can delete recipients"
ON public.appointment_recipients
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.appointment_requests ar
    WHERE ar.id = appointment_id
    AND ar.sender_id = public.get_current_profile_id()
  )
);

-- 3. Create a function to clean up expired appointments
CREATE OR REPLACE FUNCTION public.cleanup_expired_appointments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_deleted_count integer := 0;
BEGIN
  -- Delete appointment_recipients for expired appointments first
  DELETE FROM public.appointment_recipients
  WHERE appointment_id IN (
    SELECT id FROM public.appointment_requests
    WHERE appointment_date < now()
  );

  -- Delete expired appointment_requests
  WITH deleted AS (
    DELETE FROM public.appointment_requests
    WHERE appointment_date < now()
    RETURNING id
  )
  SELECT count(*) INTO v_deleted_count FROM deleted;

  RETURN v_deleted_count;
END;
$$;

-- 4. Create edge function-callable wrapper
CREATE OR REPLACE FUNCTION public.delete_appointment_by_creator(p_appointment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_sender_id uuid;
  v_current_profile_id uuid;
BEGIN
  v_current_profile_id := get_current_profile_id();
  
  SELECT sender_id INTO v_sender_id
  FROM appointment_requests
  WHERE id = p_appointment_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Appointment not found');
  END IF;
  
  IF v_sender_id != v_current_profile_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the appointment creator can delete this appointment.');
  END IF;
  
  -- Delete recipients first
  DELETE FROM appointment_recipients WHERE appointment_id = p_appointment_id;
  
  -- Delete the appointment
  DELETE FROM appointment_requests WHERE id = p_appointment_id;
  
  -- Clean related notifications
  DELETE FROM notifications 
  WHERE reference_id = p_appointment_id::text 
  AND reference_type = 'appointment';
  
  RETURN jsonb_build_object('success', true, 'message', 'Appointment deleted successfully');
END;
$$;
