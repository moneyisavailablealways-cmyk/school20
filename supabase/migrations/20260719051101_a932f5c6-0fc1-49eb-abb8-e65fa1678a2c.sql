
-- =========================================================
-- PHASE 1: Admissions rebuild — schema extensions
-- =========================================================

-- 1. Extend admission_applications
ALTER TABLE public.admission_applications
  ADD COLUMN IF NOT EXISTS application_type text NOT NULL DEFAULT 'learner',
  ADD COLUMN IF NOT EXISTS application_number text,
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS parent_national_id text,
  ADD COLUMN IF NOT EXISTS parent_relationship text,
  ADD COLUMN IF NOT EXISTS documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS medical_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS emergency_contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS interview_at timestamptz,
  ADD COLUMN IF NOT EXISTS exam_score numeric,
  ADD COLUMN IF NOT EXISTS reviewer_id uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS staff_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_learner_id uuid,
  ADD COLUMN IF NOT EXISTS created_teacher_id uuid,
  ADD COLUMN IF NOT EXISTS created_parent_id uuid,
  ADD COLUMN IF NOT EXISTS national_id text,
  ADD COLUMN IF NOT EXISTS birth_certificate_number text;

-- Constrain values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admission_applications_type_chk') THEN
    ALTER TABLE public.admission_applications
      ADD CONSTRAINT admission_applications_type_chk
      CHECK (application_type IN ('learner','staff'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admission_applications_source_chk') THEN
    ALTER TABLE public.admission_applications
      ADD CONSTRAINT admission_applications_source_chk
      CHECK (source IN ('internal','online'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admission_applications_stage_chk') THEN
    ALTER TABLE public.admission_applications
      ADD CONSTRAINT admission_applications_stage_chk
      CHECK (stage IN ('pending','under_review','interview_scheduled','entrance_exam','waiting_list','accepted','rejected','cancelled','enrolled'));
  END IF;
END $$;

-- Unique application_number per school
CREATE UNIQUE INDEX IF NOT EXISTS admission_applications_app_number_school_key
  ON public.admission_applications(school_id, application_number)
  WHERE application_number IS NOT NULL;

-- 2. Auto-generate application_number
CREATE OR REPLACE FUNCTION public.generate_application_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  yr text := to_char(now(), 'YYYY');
  next_num int;
BEGIN
  IF NEW.application_number IS NOT NULL AND NEW.application_number <> '' THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(
    MAX(CAST(regexp_replace(application_number, '^APP-\d{4}-', '') AS int)), 0
  ) + 1
  INTO next_num
  FROM public.admission_applications
  WHERE school_id = NEW.school_id
    AND application_number LIKE 'APP-' || yr || '-%';
  NEW.application_number := 'APP-' || yr || '-' || lpad(next_num::text, 6, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_application_number ON public.admission_applications;
CREATE TRIGGER trg_generate_application_number
  BEFORE INSERT ON public.admission_applications
  FOR EACH ROW EXECUTE FUNCTION public.generate_application_number();

-- Backfill numbers for existing rows
DO $$
DECLARE r record; yr text; n int;
BEGIN
  FOR r IN SELECT id, school_id, created_at FROM public.admission_applications
           WHERE application_number IS NULL ORDER BY school_id, created_at LOOP
    yr := to_char(r.created_at, 'YYYY');
    SELECT COALESCE(MAX(CAST(regexp_replace(application_number, '^APP-\d{4}-', '') AS int)), 0) + 1
      INTO n FROM public.admission_applications
      WHERE school_id = r.school_id AND application_number LIKE 'APP-'||yr||'-%';
    UPDATE public.admission_applications
       SET application_number = 'APP-'||yr||'-'||lpad(n::text,6,'0')
     WHERE id = r.id;
  END LOOP;
END $$;

-- Backfill stage from legacy status
UPDATE public.admission_applications
   SET stage = CASE
     WHEN status = 'approved' THEN 'accepted'
     WHEN status = 'rejected' THEN 'rejected'
     ELSE 'pending'
   END
 WHERE stage = 'pending' AND status IS NOT NULL AND status <> 'pending';

-- =========================================================
-- 3. application_status_history
-- =========================================================
CREATE TABLE IF NOT EXISTS public.application_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.admission_applications(id) ON DELETE CASCADE,
  school_id uuid NOT NULL,
  from_stage text,
  to_stage text NOT NULL,
  reason text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ash_application ON public.application_status_history(application_id);
CREATE INDEX IF NOT EXISTS idx_ash_school ON public.application_status_history(school_id);

GRANT SELECT, INSERT ON public.application_status_history TO authenticated;
GRANT ALL ON public.application_status_history TO service_role;
ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "school staff read app history"
  ON public.application_status_history FOR SELECT
  TO authenticated
  USING (school_id = public.get_current_school_id() AND public.is_staff_admin());
CREATE POLICY "school staff insert app history"
  ON public.application_status_history FOR INSERT
  TO authenticated
  WITH CHECK (school_id = public.get_current_school_id() AND public.is_staff_admin());

-- Automatic history insert whenever stage changes
CREATE OR REPLACE FUNCTION public.log_application_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.application_status_history(application_id, school_id, from_stage, to_stage, changed_by)
    VALUES (NEW.id, NEW.school_id, NULL, NEW.stage, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.application_status_history(application_id, school_id, from_stage, to_stage, changed_by)
    VALUES (NEW.id, NEW.school_id, OLD.stage, NEW.stage, auth.uid());
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_application_stage_change ON public.admission_applications;
CREATE TRIGGER trg_log_application_stage_change
  AFTER INSERT OR UPDATE OF stage ON public.admission_applications
  FOR EACH ROW EXECUTE FUNCTION public.log_application_stage_change();

-- =========================================================
-- 4. application_documents
-- =========================================================
CREATE TABLE IF NOT EXISTS public.application_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.admission_applications(id) ON DELETE CASCADE,
  school_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  document_type text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_appdocs_application ON public.application_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_appdocs_school ON public.application_documents(school_id);

GRANT SELECT, INSERT, DELETE ON public.application_documents TO authenticated;
GRANT ALL ON public.application_documents TO service_role;
ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "school staff read app documents"
  ON public.application_documents FOR SELECT
  TO authenticated
  USING (school_id = public.get_current_school_id() AND public.is_staff_admin());
CREATE POLICY "school staff insert app documents"
  ON public.application_documents FOR INSERT
  TO authenticated
  WITH CHECK (school_id = public.get_current_school_id() AND public.is_staff_admin());
CREATE POLICY "school staff delete app documents"
  ON public.application_documents FOR DELETE
  TO authenticated
  USING (school_id = public.get_current_school_id() AND public.is_staff_admin());

-- =========================================================
-- 5. school_settings additions
-- =========================================================
ALTER TABLE public.school_settings
  ADD COLUMN IF NOT EXISTS admissions_mode text NOT NULL DEFAULT 'internal_only',
  ADD COLUMN IF NOT EXISTS auto_create_parent_login boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_create_learner_login boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_create_teacher_login boolean NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'school_settings_admissions_mode_chk') THEN
    ALTER TABLE public.school_settings
      ADD CONSTRAINT school_settings_admissions_mode_chk
      CHECK (admissions_mode IN ('internal_only','internal_and_online'));
  END IF;
END $$;

-- =========================================================
-- 6. Public read for online-admissions detection (schools + slug)
--    Anonymous applicants need to look up a school by slug before
--    submitting via the public edge function. Only expose fields
--    that are safe to display publicly.
-- =========================================================
-- (No schema change needed here; the edge function will use the
-- service role. RLS on `schools` remains unchanged.)
