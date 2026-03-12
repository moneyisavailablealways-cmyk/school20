-- Backfill school_id on subject_submissions where it's NULL
-- Use the submitter's profile school_id
UPDATE public.subject_submissions ss
SET school_id = p.school_id
FROM public.profiles p
WHERE ss.submitted_by = p.id
  AND ss.school_id IS NULL
  AND p.school_id IS NOT NULL;