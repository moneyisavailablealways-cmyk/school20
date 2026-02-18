
-- Step 1 only: Add super_admin to enum (must commit before using it)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_admin';
