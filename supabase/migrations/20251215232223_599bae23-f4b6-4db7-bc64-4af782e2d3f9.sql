-- Create a new table for appointment requests (sender/receiver model)
CREATE TABLE public.appointment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text,
  appointment_date timestamp with time zone NOT NULL,
  duration_minutes integer DEFAULT 30,
  meeting_type text DEFAULT 'in_person',
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_role text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create a junction table for appointment recipients (one-to-many)
CREATE TABLE public.appointment_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointment_requests(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_role text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  response_date timestamp with time zone,
  response_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(appointment_id, recipient_id)
);

-- Enable RLS
ALTER TABLE public.appointment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_recipients ENABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at on appointment_requests
CREATE TRIGGER update_appointment_requests_updated_at
  BEFORE UPDATE ON public.appointment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on appointment_recipients
CREATE TRIGGER update_appointment_recipients_updated_at
  BEFORE UPDATE ON public.appointment_recipients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for appointment_requests

-- All authenticated users (except admin) can create appointments
CREATE POLICY "Users can create appointment requests"
ON public.appointment_requests
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles p2
    WHERE p2.user_id = auth.uid() 
    AND p2.role != 'admin'
  )
);

-- Users can view appointments they created
CREATE POLICY "Users can view their own appointment requests"
ON public.appointment_requests
FOR SELECT
TO authenticated
USING (
  sender_id = (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- Users can update/delete their own appointments
CREATE POLICY "Users can update their own appointment requests"
ON public.appointment_requests
FOR UPDATE
TO authenticated
USING (
  sender_id = (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
);

CREATE POLICY "Users can delete their own appointment requests"
ON public.appointment_requests
FOR DELETE
TO authenticated
USING (
  sender_id = (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- Admins can view all appointments (read-only monitoring)
CREATE POLICY "Admins can view all appointment requests"
ON public.appointment_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'principal')
  )
);

-- Users can view appointments where they are a recipient
CREATE POLICY "Recipients can view appointment requests"
ON public.appointment_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.appointment_recipients ar
    JOIN public.profiles p ON p.id = ar.recipient_id
    WHERE ar.appointment_id = appointment_requests.id
    AND p.user_id = auth.uid()
  )
);

-- RLS Policies for appointment_recipients

-- Senders can insert recipients
CREATE POLICY "Senders can add recipients"
ON public.appointment_recipients
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.appointment_requests ar
    JOIN public.profiles p ON p.id = ar.sender_id
    WHERE ar.id = appointment_recipients.appointment_id
    AND p.user_id = auth.uid()
  )
);

-- Senders can view their appointment recipients
CREATE POLICY "Senders can view recipients"
ON public.appointment_recipients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.appointment_requests ar
    JOIN public.profiles p ON p.id = ar.sender_id
    WHERE ar.id = appointment_recipients.appointment_id
    AND p.user_id = auth.uid()
  )
);

-- Recipients can view their own recipient records
CREATE POLICY "Recipients can view their own records"
ON public.appointment_recipients
FOR SELECT
TO authenticated
USING (
  recipient_id = (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- Recipients can update their status (approve/reject)
CREATE POLICY "Recipients can update their status"
ON public.appointment_recipients
FOR UPDATE
TO authenticated
USING (
  recipient_id = (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- Admins can view all recipient records
CREATE POLICY "Admins can view all recipient records"
ON public.appointment_recipients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'principal')
  )
);

-- Senders can delete recipients
CREATE POLICY "Senders can delete recipients"
ON public.appointment_recipients
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.appointment_requests ar
    JOIN public.profiles p ON p.id = ar.sender_id
    WHERE ar.id = appointment_recipients.appointment_id
    AND p.user_id = auth.uid()
  )
);

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_recipients;