
-- Fix student with missing school_id by inheriting from profile
UPDATE public.students s
SET school_id = p.school_id
FROM public.profiles p
WHERE s.profile_id = p.id
  AND s.school_id IS NULL
  AND p.school_id IS NOT NULL;

-- Fix orphaned school_settings rows: match by school_name to the correct school
UPDATE public.school_settings ss
SET school_id = sch.id
FROM public.schools sch
WHERE ss.school_id IS NULL
  AND LOWER(TRIM(ss.school_name)) = LOWER(TRIM(sch.school_name));

-- Sync logo_url from school_settings to schools table where schools.logo_url is null
UPDATE public.schools sch
SET logo_url = ss.logo_url
FROM public.school_settings ss
WHERE ss.school_id = sch.id
  AND ss.logo_url IS NOT NULL
  AND ss.logo_url != ''
  AND (sch.logo_url IS NULL OR sch.logo_url = '');

-- Delete duplicate/orphaned school_settings rows that still have no school_id
DELETE FROM public.school_settings WHERE school_id IS NULL;

-- Create a trigger to auto-set student.school_id from profile on insert
CREATE OR REPLACE FUNCTION public.auto_set_student_school_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.school_id IS NULL AND NEW.profile_id IS NOT NULL THEN
    SELECT school_id INTO NEW.school_id
    FROM public.profiles
    WHERE id = NEW.profile_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_auto_set_student_school_id ON public.students;
CREATE TRIGGER trg_auto_set_student_school_id
  BEFORE INSERT ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_student_school_id();
