
-- MESSAGES
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  thread_id uuid,
  parent_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL,
  sender_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.message_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  is_archived boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, recipient_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_recipients TO authenticated;
GRANT ALL ON public.message_recipients TO service_role;

CREATE INDEX idx_messages_school ON public.messages(school_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id, created_at DESC);
CREATE INDEX idx_messages_thread ON public.messages(thread_id, created_at);
CREATE INDEX idx_msg_recipients_recipient ON public.message_recipients(recipient_id, is_read, created_at DESC);
CREATE INDEX idx_msg_recipients_message ON public.message_recipients(message_id);
CREATE INDEX idx_msg_recipients_school ON public.message_recipients(school_id);

-- helpers (security definer, avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_message_recipient(_message_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.message_recipients mr
    JOIN public.profiles p ON p.id = mr.recipient_id
    WHERE mr.message_id = _message_id AND p.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_message_sender(_message_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.profiles p ON p.id = m.sender_id
    WHERE m.id = _message_id AND p.user_id = auth.uid()
  );
$$;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages" ON public.messages
FOR SELECT TO authenticated
USING (
  school_id = public.get_current_school_id()
  AND (
    sender_id = public.get_current_profile_id()
    OR public.is_message_recipient(id)
  )
);

CREATE POLICY "Users can send messages in their school" ON public.messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = public.get_current_profile_id()
  AND school_id = public.get_current_school_id()
);

CREATE POLICY "Senders can update their messages" ON public.messages
FOR UPDATE TO authenticated
USING (sender_id = public.get_current_profile_id())
WITH CHECK (sender_id = public.get_current_profile_id());

CREATE POLICY "Senders can delete their messages" ON public.messages
FOR DELETE TO authenticated
USING (sender_id = public.get_current_profile_id());

CREATE POLICY "Participants can view message recipients" ON public.message_recipients
FOR SELECT TO authenticated
USING (
  school_id = public.get_current_school_id()
  AND (
    recipient_id = public.get_current_profile_id()
    OR public.is_message_sender(message_id)
  )
);

CREATE POLICY "Senders can add recipients" ON public.message_recipients
FOR INSERT TO authenticated
WITH CHECK (
  school_id = public.get_current_school_id()
  AND public.is_message_sender(message_id)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = recipient_id AND p.school_id = public.get_current_school_id()
  )
);

CREATE POLICY "Recipients can update their copy" ON public.message_recipients
FOR UPDATE TO authenticated
USING (recipient_id = public.get_current_profile_id())
WITH CHECK (recipient_id = public.get_current_profile_id());

CREATE POLICY "Recipients can delete their copy" ON public.message_recipients
FOR DELETE TO authenticated
USING (recipient_id = public.get_current_profile_id());

-- timestamps
CREATE TRIGGER trg_messages_updated_at BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_message_recipients_updated_at BEFORE UPDATE ON public.message_recipients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- default thread id
CREATE OR REPLACE FUNCTION public.set_message_thread()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.thread_id IS NULL THEN
    IF NEW.parent_message_id IS NOT NULL THEN
      SELECT COALESCE(thread_id, id) INTO NEW.thread_id FROM public.messages WHERE id = NEW.parent_message_id;
    END IF;
    NEW.thread_id := COALESCE(NEW.thread_id, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_set_message_thread BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.set_message_thread();

-- notify recipients
CREATE OR REPLACE FUNCTION public.notify_message_recipient()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  m RECORD;
  sender_name text;
BEGIN
  SELECT * INTO m FROM public.messages WHERE id = NEW.message_id;
  SELECT COALESCE(first_name,'') || ' ' || COALESCE(last_name,'') INTO sender_name
  FROM public.profiles WHERE id = m.sender_id;

  INSERT INTO public.notifications (user_id, school_id, title, message, type, category, reference_id, reference_type)
  VALUES (
    NEW.recipient_id,
    NEW.school_id,
    CASE WHEN m.parent_message_id IS NULL THEN 'New message from ' || trim(sender_name)
         ELSE 'Reply from ' || trim(sender_name) END,
    COALESCE(NULLIF(m.subject,''), left(m.body, 80)),
    CASE WHEN m.parent_message_id IS NULL THEN 'message' ELSE 'message_reply' END,
    'communication',
    m.id,
    'message'
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_message_recipient AFTER INSERT ON public.message_recipients
FOR EACH ROW EXECUTE FUNCTION public.notify_message_recipient();

-- realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.message_recipients REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_recipients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
