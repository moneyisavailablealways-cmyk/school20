CREATE OR REPLACE FUNCTION public.normalize_gender(p_gender text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE v text;
BEGIN
  v := lower(trim(COALESCE(p_gender, '')));
  IF v = '' THEN RETURN NULL; END IF;
  IF v IN ('m', 'male', 'boy') THEN RETURN 'male'; END IF;
  IF v IN ('f', 'female', 'girl') THEN RETURN 'female'; END IF;
  RAISE EXCEPTION 'Invalid gender "%". Please select either Male or Female.', p_gender
    USING ERRCODE = '22023';
END;
$$;

CREATE OR REPLACE FUNCTION public.students_normalize_gender()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.gender := public.normalize_gender(NEW.gender);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_students_normalize_gender ON public.students;
CREATE TRIGGER trg_students_normalize_gender
BEFORE INSERT OR UPDATE OF gender ON public.students
FOR EACH ROW EXECUTE FUNCTION public.students_normalize_gender();

UPDATE public.students SET gender = lower(trim(gender))
WHERE gender IS NOT NULL AND lower(trim(gender)) IN ('male','female') AND gender <> lower(trim(gender));