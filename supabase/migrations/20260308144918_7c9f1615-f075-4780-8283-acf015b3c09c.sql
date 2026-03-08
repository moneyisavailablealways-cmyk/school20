
-- Academic Terms table (extends existing academic_years)
CREATE TABLE public.academic_terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  term_name TEXT NOT NULL,
  term_number INTEGER NOT NULL DEFAULT 1,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  holiday_start_date DATE,
  holiday_end_date DATE,
  opening_day DATE,
  closing_day DATE,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(academic_year_id, term_number, school_id)
);

-- School Events table
CREATE TABLE public.school_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_term_id UUID REFERENCES public.academic_terms(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'general',
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  is_all_day BOOLEAN NOT NULL DEFAULT true,
  target_audience TEXT[] NOT NULL DEFAULT ARRAY['all'],
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_events ENABLE ROW LEVEL SECURITY;

-- RLS for academic_terms: staff can manage, all school users can view
CREATE POLICY "Staff can manage academic terms"
ON public.academic_terms
FOR ALL
TO authenticated
USING (school_id = public.get_current_school_id() AND public.is_staff_admin())
WITH CHECK (school_id = public.get_current_school_id() AND public.is_staff_admin());

CREATE POLICY "School users can view academic terms"
ON public.academic_terms
FOR SELECT
TO authenticated
USING (school_id = public.get_current_school_id());

-- RLS for school_events: staff can manage, all school users can view
CREATE POLICY "Staff can manage school events"
ON public.school_events
FOR ALL
TO authenticated
USING (school_id = public.get_current_school_id() AND public.is_staff_admin())
WITH CHECK (school_id = public.get_current_school_id() AND public.is_staff_admin());

CREATE POLICY "School users can view school events"
ON public.school_events
FOR SELECT
TO authenticated
USING (school_id = public.get_current_school_id());

-- Super admin bypass
CREATE POLICY "Super admin bypass academic terms"
ON public.academic_terms
FOR ALL
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Super admin bypass school events"
ON public.school_events
FOR ALL
TO authenticated
USING (public.is_super_admin());

-- Updated_at triggers
CREATE TRIGGER update_academic_terms_updated_at
  BEFORE UPDATE ON public.academic_terms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_school_events_updated_at
  BEFORE UPDATE ON public.school_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get current term for a school
CREATE OR REPLACE FUNCTION public.get_current_academic_term(p_school_id UUID)
RETURNS TABLE(
  id UUID, term_name TEXT, term_number INTEGER,
  start_date DATE, end_date DATE, 
  holiday_start_date DATE, holiday_end_date DATE,
  opening_day DATE, closing_day DATE,
  total_days INTEGER, days_passed INTEGER, days_remaining INTEGER,
  progress_percentage NUMERIC,
  is_holiday BOOLEAN,
  academic_year_name TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  RETURN QUERY
  SELECT 
    at.id, at.term_name, at.term_number,
    at.start_date, at.end_date,
    at.holiday_start_date, at.holiday_end_date,
    at.opening_day, at.closing_day,
    (at.end_date - at.start_date + 1)::INTEGER AS total_days,
    GREATEST(0, LEAST(v_today - at.start_date, at.end_date - at.start_date + 1))::INTEGER AS days_passed,
    GREATEST(0, at.end_date - v_today)::INTEGER AS days_remaining,
    ROUND(
      GREATEST(0, LEAST(
        (v_today - at.start_date)::NUMERIC / NULLIF((at.end_date - at.start_date)::NUMERIC, 0) * 100,
        100
      )), 1
    ) AS progress_percentage,
    (v_today > at.end_date AND (at.holiday_end_date IS NULL OR v_today <= at.holiday_end_date)) AS is_holiday,
    ay.name AS academic_year_name
  FROM academic_terms at
  JOIN academic_years ay ON ay.id = at.academic_year_id
  WHERE at.school_id = p_school_id
    AND at.is_current = true
  LIMIT 1;
END;
$$;

-- Function to send automated term notifications
CREATE OR REPLACE FUNCTION public.send_term_notifications(p_school_id UUID, p_notification_type TEXT, p_custom_message TEXT DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_school_name TEXT;
  v_message TEXT;
  v_title TEXT;
  v_count INTEGER := 0;
  v_user RECORD;
BEGIN
  SELECT school_name INTO v_school_name FROM schools WHERE id = p_school_id;
  
  IF p_notification_type = 'weekend' THEN
    v_title := 'Happy Weekend! 🎉';
    v_message := 'Hello from ' || v_school_name || '. We wish all our students, teachers and parents a wonderful weekend. Thank you for being part of our school community.';
  ELSIF p_notification_type = 'holiday' THEN
    v_title := 'Happy Holidays! 🌟';
    v_message := v_school_name || ' wishes all students, teachers and parents a happy holiday. Thank you for your hard work this term. Enjoy your holidays and we look forward to next term.';
  ELSIF p_notification_type = 'reminder' THEN
    v_title := 'Term Reminder 📋';
    v_message := COALESCE(p_custom_message, 'Important reminder from ' || v_school_name);
  ELSE
    v_title := 'School Notification';
    v_message := COALESCE(p_custom_message, 'Notification from ' || v_school_name);
  END IF;

  FOR v_user IN
    SELECT id FROM profiles WHERE school_id = p_school_id AND is_active = true
  LOOP
    INSERT INTO notifications (user_id, title, message, type, category, school_id)
    VALUES (v_user.id, v_title, v_message, 'info', 'academic_calendar', p_school_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
