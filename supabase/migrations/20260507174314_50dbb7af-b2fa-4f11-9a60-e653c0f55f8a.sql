-- 1. Enum for level type
DO $$ BEGIN
  CREATE TYPE public.section_level_type AS ENUM ('nursery', 'primary');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Schools: opt-in flag for nursery section
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS has_nursery_section boolean NOT NULL DEFAULT false;

-- 3. Add level_type to core tables (default 'primary' so existing data is unaffected)
ALTER TABLE public.classes              ADD COLUMN IF NOT EXISTS level_type public.section_level_type NOT NULL DEFAULT 'primary';
ALTER TABLE public.students             ADD COLUMN IF NOT EXISTS level_type public.section_level_type NOT NULL DEFAULT 'primary';
ALTER TABLE public.subjects             ADD COLUMN IF NOT EXISTS level_type public.section_level_type NOT NULL DEFAULT 'primary';
ALTER TABLE public.fee_structures       ADD COLUMN IF NOT EXISTS level_type public.section_level_type NOT NULL DEFAULT 'primary';
ALTER TABLE public.invoices             ADD COLUMN IF NOT EXISTS level_type public.section_level_type NOT NULL DEFAULT 'primary';
ALTER TABLE public.payments             ADD COLUMN IF NOT EXISTS level_type public.section_level_type NOT NULL DEFAULT 'primary';
ALTER TABLE public.attendance_records   ADD COLUMN IF NOT EXISTS level_type public.section_level_type NOT NULL DEFAULT 'primary';
ALTER TABLE public.report_cards         ADD COLUMN IF NOT EXISTS level_type public.section_level_type NOT NULL DEFAULT 'primary';
ALTER TABLE public.library_items        ADD COLUMN IF NOT EXISTS level_type public.section_level_type NOT NULL DEFAULT 'primary';
ALTER TABLE public.timetables           ADD COLUMN IF NOT EXISTS level_type public.section_level_type NOT NULL DEFAULT 'primary';
ALTER TABLE public.teachers             ADD COLUMN IF NOT EXISTS level_type public.section_level_type NOT NULL DEFAULT 'primary';

-- 4. Indexes for fast (school_id, level_type) filtering
CREATE INDEX IF NOT EXISTS idx_classes_school_level             ON public.classes(school_id, level_type);
CREATE INDEX IF NOT EXISTS idx_students_school_level            ON public.students(school_id, level_type);
CREATE INDEX IF NOT EXISTS idx_subjects_school_level            ON public.subjects(school_id, level_type);
CREATE INDEX IF NOT EXISTS idx_fee_structures_school_level      ON public.fee_structures(school_id, level_type);
CREATE INDEX IF NOT EXISTS idx_invoices_school_level            ON public.invoices(school_id, level_type);
CREATE INDEX IF NOT EXISTS idx_payments_school_level            ON public.payments(school_id, level_type);
CREATE INDEX IF NOT EXISTS idx_attendance_school_level          ON public.attendance_records(school_id, level_type);
CREATE INDEX IF NOT EXISTS idx_report_cards_school_level        ON public.report_cards(school_id, level_type);
CREATE INDEX IF NOT EXISTS idx_library_items_school_level       ON public.library_items(school_id, level_type);
CREATE INDEX IF NOT EXISTS idx_timetables_school_level          ON public.timetables(school_id, level_type);
CREATE INDEX IF NOT EXISTS idx_teachers_school_level            ON public.teachers(school_id, level_type);

-- 5. Trigger: keep students aligned with their (active) class enrollment level
CREATE OR REPLACE FUNCTION public.sync_student_level_from_class()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_level public.section_level_type;
BEGIN
  IF NEW.class_id IS NOT NULL THEN
    SELECT level_type INTO v_level FROM public.classes WHERE id = NEW.class_id;
    IF v_level IS NOT NULL THEN
      UPDATE public.students SET level_type = v_level WHERE id = NEW.student_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_student_level ON public.student_enrollments;
CREATE TRIGGER trg_sync_student_level
AFTER INSERT OR UPDATE OF class_id ON public.student_enrollments
FOR EACH ROW EXECUTE FUNCTION public.sync_student_level_from_class();

-- 6. Reclassification helper: move selected classes (and everything attached) to nursery/primary
CREATE OR REPLACE FUNCTION public.reclassify_classes_level(
  p_school_id uuid,
  p_class_ids uuid[],
  p_level public.section_level_type
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_school uuid;
  v_classes int := 0;
  v_students int := 0;
  v_attendance int := 0;
  v_reports int := 0;
  v_invoices int := 0;
  v_payments int := 0;
  v_timetables int := 0;
  v_fee_structs int := 0;
BEGIN
  -- Authorization: caller must be admin/principal/head_teacher of this school
  SELECT school_id INTO v_caller_school
  FROM public.profiles
  WHERE user_id = auth.uid()
    AND role IN ('admin', 'principal', 'head_teacher')
  LIMIT 1;

  IF v_caller_school IS NULL OR v_caller_school <> p_school_id THEN
    RAISE EXCEPTION 'Not authorized to reclassify records for this school';
  END IF;

  -- Update classes (scoped strictly to this school)
  WITH updated AS (
    UPDATE public.classes
    SET level_type = p_level, updated_at = now()
    WHERE id = ANY(p_class_ids) AND school_id = p_school_id
    RETURNING id
  ) SELECT count(*) INTO v_classes FROM updated;

  -- Students currently enrolled (active) in those classes
  WITH updated AS (
    UPDATE public.students s
    SET level_type = p_level
    WHERE s.school_id = p_school_id
      AND EXISTS (
        SELECT 1 FROM public.student_enrollments se
        WHERE se.student_id = s.id
          AND se.class_id = ANY(p_class_ids)
          AND se.status = 'active'
      )
    RETURNING s.id
  ) SELECT count(*) INTO v_students FROM updated;

  -- Attendance
  WITH updated AS (
    UPDATE public.attendance_records SET level_type = p_level
    WHERE school_id = p_school_id AND class_id = ANY(p_class_ids)
    RETURNING id
  ) SELECT count(*) INTO v_attendance FROM updated;

  -- Report cards (linked to students of those classes)
  WITH updated AS (
    UPDATE public.report_cards rc
    SET level_type = p_level
    WHERE rc.school_id = p_school_id
      AND rc.student_id IN (
        SELECT se.student_id FROM public.student_enrollments se
        WHERE se.class_id = ANY(p_class_ids) AND se.status = 'active'
      )
    RETURNING rc.id
  ) SELECT count(*) INTO v_reports FROM updated;

  -- Invoices for those students
  WITH updated AS (
    UPDATE public.invoices i
    SET level_type = p_level
    WHERE i.school_id = p_school_id
      AND i.student_id IN (
        SELECT se.student_id FROM public.student_enrollments se
        WHERE se.class_id = ANY(p_class_ids) AND se.status = 'active'
      )
    RETURNING i.id
  ) SELECT count(*) INTO v_invoices FROM updated;

  -- Payments tied to those invoices
  WITH updated AS (
    UPDATE public.payments p
    SET level_type = p_level
    WHERE p.invoice_id IN (
      SELECT id FROM public.invoices WHERE school_id = p_school_id AND level_type = p_level
        AND student_id IN (
          SELECT se.student_id FROM public.student_enrollments se
          WHERE se.class_id = ANY(p_class_ids) AND se.status = 'active'
        )
    )
    RETURNING p.id
  ) SELECT count(*) INTO v_payments FROM updated;

  -- Timetables for those classes
  WITH updated AS (
    UPDATE public.timetables SET level_type = p_level
    WHERE school_id = p_school_id AND class_id = ANY(p_class_ids)
    RETURNING id
  ) SELECT count(*) INTO v_timetables FROM updated;

  -- Fee structures for those classes
  WITH updated AS (
    UPDATE public.fee_structures SET level_type = p_level
    WHERE school_id = p_school_id AND class_id = ANY(p_class_ids)
    RETURNING id
  ) SELECT count(*) INTO v_fee_structs FROM updated;

  RETURN jsonb_build_object(
    'success', true,
    'classes', v_classes,
    'students', v_students,
    'attendance', v_attendance,
    'report_cards', v_reports,
    'invoices', v_invoices,
    'payments', v_payments,
    'timetables', v_timetables,
    'fee_structures', v_fee_structs
  );
END;
$$;
