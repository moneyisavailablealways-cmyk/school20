
-- Helper: does a teacher (profile id) teach a given student row?
CREATE OR REPLACE FUNCTION public.teacher_teaches_student_row(_teacher_profile uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    JOIN public.classes c ON c.id = s.current_class_id
    WHERE s.id = _student_id
      AND (
        c.class_teacher_id = _teacher_profile
        OR EXISTS (
          SELECT 1 FROM public.teacher_enrollments te
          WHERE te.teacher_id = _teacher_profile
            AND te.class_id = c.id
            AND COALESCE(te.status, 'active') = 'active'
        )
        OR EXISTS (
          SELECT 1 FROM public.teacher_specializations ts
          JOIN public.teachers t ON t.id = ts.teacher_id
          WHERE t.profile_id = _teacher_profile
            AND ts.class_id = c.id
        )
      )
  );
$$;

-- Helper: does a teacher teach the student that owns this student profile?
CREATE OR REPLACE FUNCTION public.teacher_teaches_student_profile(_teacher_profile uuid, _student_profile uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.profile_id = _student_profile
      AND public.teacher_teaches_student_row(_teacher_profile, s.id)
  );
$$;

-- Helper: is this parent linked to a student taught by this teacher?
CREATE OR REPLACE FUNCTION public.teacher_linked_to_parent(_teacher_profile uuid, _parent_profile uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_student_relationships psr
    WHERE psr.parent_id = _parent_profile
      AND public.teacher_teaches_student_row(_teacher_profile, psr.student_id)
  );
$$;

-- Helper: is this parent linked to this student profile?
CREATE OR REPLACE FUNCTION public.parent_linked_to_student_profile(_parent_profile uuid, _student_profile uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parent_student_relationships psr
    JOIN public.students s ON s.id = psr.student_id
    WHERE psr.parent_id = _parent_profile
      AND s.profile_id = _student_profile
  );
$$;

-- Core permission matrix
CREATE OR REPLACE FUNCTION public.can_message_recipient(_sender uuid, _recipient uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  srole public.user_role;
  rrole public.user_role;
  sschool uuid;
  rschool uuid;
BEGIN
  IF _sender IS NULL OR _recipient IS NULL THEN RETURN false; END IF;

  SELECT role, school_id INTO srole, sschool FROM public.profiles WHERE id = _sender;
  SELECT role, school_id INTO rrole, rschool FROM public.profiles WHERE id = _recipient;

  IF srole IS NULL OR rrole IS NULL THEN RETURN false; END IF;
  IF srole = 'super_admin' THEN RETURN true; END IF;
  IF sschool IS NULL OR rschool IS NULL OR sschool <> rschool THEN RETURN false; END IF;

  IF srole IN ('admin', 'principal', 'head_teacher') THEN
    RETURN rrole IN ('admin','principal','head_teacher','bursar','librarian','teacher','student','parent');
  END IF;

  IF srole IN ('bursar', 'librarian') THEN
    RETURN rrole IN ('principal','head_teacher','bursar','librarian','teacher','student','parent');
  END IF;

  IF srole = 'teacher' THEN
    IF rrole IN ('principal','head_teacher','bursar','librarian','teacher') THEN RETURN true; END IF;
    IF rrole = 'student' THEN RETURN public.teacher_teaches_student_profile(_sender, _recipient); END IF;
    IF rrole = 'parent' THEN RETURN public.teacher_linked_to_parent(_sender, _recipient); END IF;
    RETURN false;
  END IF;

  IF srole = 'student' THEN
    IF rrole IN ('principal','head_teacher','bursar','librarian') THEN RETURN true; END IF;
    IF rrole = 'teacher' THEN RETURN public.teacher_teaches_student_profile(_recipient, _sender); END IF;
    IF rrole = 'parent' THEN RETURN public.parent_linked_to_student_profile(_recipient, _sender); END IF;
    RETURN false;
  END IF;

  IF srole = 'parent' THEN
    IF rrole IN ('principal','head_teacher','bursar','librarian') THEN RETURN true; END IF;
    IF rrole = 'teacher' THEN RETURN public.teacher_linked_to_parent(_recipient, _sender); END IF;
    IF rrole = 'student' THEN RETURN public.parent_linked_to_student_profile(_sender, _recipient); END IF;
    RETURN false;
  END IF;

  RETURN false;
END;
$$;

-- Replies: recipient already participates in the thread
CREATE OR REPLACE FUNCTION public.is_thread_participant(_message_id uuid, _profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.thread_id = (SELECT COALESCE(thread_id, id) FROM public.messages WHERE id = _message_id)
      AND (
        m.sender_id = _profile_id
        OR EXISTS (SELECT 1 FROM public.message_recipients mr WHERE mr.message_id = m.id AND mr.recipient_id = _profile_id)
      )
  );
$$;

DROP POLICY IF EXISTS "Senders can add recipients" ON public.message_recipients;
CREATE POLICY "Senders can add allowed recipients"
ON public.message_recipients
FOR INSERT
TO authenticated
WITH CHECK (
  school_id = public.get_current_school_id()
  AND public.is_message_sender(message_id)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = message_recipients.recipient_id
      AND p.school_id = public.get_current_school_id()
  )
  AND (
    public.can_message_recipient(public.get_current_profile_id(), message_recipients.recipient_id)
    OR public.is_thread_participant(message_recipients.message_id, message_recipients.recipient_id)
  )
);

-- Appointment notifications
CREATE OR REPLACE FUNCTION public.notify_appointment_recipient()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school uuid;
  v_date timestamptz;
  v_purpose text;
BEGIN
  SELECT a.school_id, a.appointment_date, a.purpose INTO v_school, v_date, v_purpose
  FROM public.appointments a WHERE a.id = NEW.appointment_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, school_id, title, message, type, category, reference_id, reference_type)
    VALUES (
      NEW.recipient_id, v_school, 'New appointment',
      COALESCE(v_purpose, 'You have a new appointment') || ' — ' || COALESCE(to_char(v_date, 'DD Mon YYYY HH24:MI'), 'date to be confirmed'),
      'appointment', 'appointment', NEW.appointment_id, 'appointment'
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, school_id, title, message, type, category, reference_id, reference_type)
    SELECT p.id, v_school, 'Appointment ' || NEW.status,
      COALESCE(v_purpose, 'Appointment') || ' was ' || NEW.status || '.',
      'appointment', 'appointment', NEW.appointment_id, 'appointment'
    FROM public.profiles p
    WHERE p.id IN (
      SELECT a.teacher_id FROM public.appointments a WHERE a.id = NEW.appointment_id
      UNION
      SELECT a.parent_id FROM public.appointments a WHERE a.id = NEW.appointment_id
    )
    AND p.id IS DISTINCT FROM NEW.recipient_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_appointment_recipient ON public.appointment_recipients;
CREATE TRIGGER trg_notify_appointment_recipient
AFTER INSERT OR UPDATE ON public.appointment_recipients
FOR EACH ROW EXECUTE FUNCTION public.notify_appointment_recipient();

CREATE OR REPLACE FUNCTION public.notify_appointment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, school_id, title, message, type, category, reference_id, reference_type)
    SELECT ar.recipient_id, NEW.school_id, 'Appointment ' || NEW.status,
      COALESCE(NEW.purpose, 'Appointment') || ' is now ' || NEW.status || '.',
      'appointment', 'appointment', NEW.id, 'appointment'
    FROM public.appointment_recipients ar
    WHERE ar.appointment_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_appointment_change ON public.appointments;
CREATE TRIGGER trg_notify_appointment_change
AFTER UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.notify_appointment_change();
