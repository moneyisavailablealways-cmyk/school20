
-- Add is_locked column to timetables for locking specific lessons
ALTER TABLE public.timetables ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;

-- Create timetable generation config table
CREATE TABLE public.timetable_generation_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  school_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}', -- 1=Mon,...,6=Sat,7=Sun
  period_duration INTEGER NOT NULL DEFAULT 40, -- minutes
  day_start_time TIME NOT NULL DEFAULT '08:00',
  periods_per_day INTEGER NOT NULL DEFAULT 8,
  break_after_period INTEGER[] NOT NULL DEFAULT '{2,5}', -- break after which periods
  break_duration INTEGER[] NOT NULL DEFAULT '{30,60}', -- break durations in minutes
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(school_id, academic_year_id)
);

ALTER TABLE public.timetable_generation_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage timetable config"
  ON public.timetable_generation_config
  FOR ALL
  TO authenticated
  USING (public.is_staff_admin())
  WITH CHECK (public.is_staff_admin());

-- Create subject periods config (how many periods per subject per week for each class)
CREATE TABLE public.subject_period_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  periods_per_week INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(class_id, subject_id)
);

ALTER TABLE public.subject_period_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage subject period config"
  ON public.subject_period_config
  FOR ALL
  TO authenticated
  USING (public.is_staff_admin())
  WITH CHECK (public.is_staff_admin());

-- Add updated_at triggers
CREATE TRIGGER update_timetable_gen_config_updated_at
  BEFORE UPDATE ON public.timetable_generation_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subject_period_config_updated_at
  BEFORE UPDATE ON public.subject_period_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
