-- Create helper function to get current user's profile id
CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Create helper function to check if user is admin/principal
CREATE OR REPLACE FUNCTION public.is_admin_or_principal()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'principal')
  );
$$;

-- Drop all existing policies on appointment_requests
DROP POLICY IF EXISTS "Admins can view all appointment requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Recipients can view appointment requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Users can create appointment requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Users can delete their own appointment requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Users can update their own appointment requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Users can view their own appointment requests" ON public.appointment_requests;

-- Drop all existing policies on appointment_recipients
DROP POLICY IF EXISTS "Admins can view all recipient records" ON public.appointment_recipients;
DROP POLICY IF EXISTS "Recipients can update their status" ON public.appointment_recipients;
DROP POLICY IF EXISTS "Recipients can view their own records" ON public.appointment_recipients;
DROP POLICY IF EXISTS "Senders can add recipients" ON public.appointment_recipients;
DROP POLICY IF EXISTS "Senders can delete recipients" ON public.appointment_recipients;
DROP POLICY IF EXISTS "Senders can view recipients" ON public.appointment_recipients;

-- Create new policies for appointment_requests using helper functions
CREATE POLICY "Users can view own appointment requests"
ON public.appointment_requests FOR SELECT
USING (sender_id = public.get_current_profile_id());

CREATE POLICY "Admins can view all appointment requests"
ON public.appointment_requests FOR SELECT
USING (public.is_admin_or_principal());

CREATE POLICY "Users can create appointment requests"
ON public.appointment_requests FOR INSERT
WITH CHECK (sender_id = public.get_current_profile_id());

CREATE POLICY "Users can update own appointment requests"
ON public.appointment_requests FOR UPDATE
USING (sender_id = public.get_current_profile_id());

CREATE POLICY "Users can delete own appointment requests"
ON public.appointment_requests FOR DELETE
USING (sender_id = public.get_current_profile_id());

-- Create new policies for appointment_recipients using helper functions
CREATE POLICY "Recipients can view their records"
ON public.appointment_recipients FOR SELECT
USING (recipient_id = public.get_current_profile_id());

CREATE POLICY "Senders can view their recipients"
ON public.appointment_recipients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.appointment_requests ar
    WHERE ar.id = appointment_recipients.appointment_id
    AND ar.sender_id = public.get_current_profile_id()
  )
);

CREATE POLICY "Admins can view all recipients"
ON public.appointment_recipients FOR SELECT
USING (public.is_admin_or_principal());

CREATE POLICY "Senders can add recipients"
ON public.appointment_recipients FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.appointment_requests ar
    WHERE ar.id = appointment_recipients.appointment_id
    AND ar.sender_id = public.get_current_profile_id()
  )
);

CREATE POLICY "Recipients can update status"
ON public.appointment_recipients FOR UPDATE
USING (recipient_id = public.get_current_profile_id());

CREATE POLICY "Senders can delete recipients"
ON public.appointment_recipients FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.appointment_requests ar
    WHERE ar.id = appointment_recipients.appointment_id
    AND ar.sender_id = public.get_current_profile_id()
  )
);