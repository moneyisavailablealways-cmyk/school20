-- Fix failing signups due to FK on activity_log.user_id referencing profiles before it exists
-- Change FK to reference auth.users instead and make it deferrable so inserts during signup don't fail

-- 1) Drop the existing FK constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'activity_log' AND c.conname = 'activity_log_user_id_fkey'
  ) THEN
    ALTER TABLE public.activity_log DROP CONSTRAINT activity_log_user_id_fkey;
  END IF;
END $$;

-- 2) Recreate the FK to reference auth.users(id), deferrable, and avoid blocking signup
ALTER TABLE public.activity_log
ADD CONSTRAINT activity_log_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE SET NULL
DEFERRABLE INITIALLY DEFERRED;

-- Optional safety: ensure user_id remains nullable (it already is, but keep it explicit)
ALTER TABLE public.activity_log ALTER COLUMN user_id DROP NOT NULL;