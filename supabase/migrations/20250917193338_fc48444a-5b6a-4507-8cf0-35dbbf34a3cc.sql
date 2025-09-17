-- Clean up and ensure only one relationship exists between classes and levels
-- This migration addresses PostgREST relationship detection issues

-- First, check current foreign key constraints
DO $$
DECLARE
    constraint_count INTEGER;
BEGIN
    -- Count foreign keys from classes to levels
    SELECT COUNT(*) INTO constraint_count
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    JOIN pg_class ft ON c.confrelid = ft.oid
    JOIN pg_namespace fn ON ft.relnamespace = fn.oid
    WHERE t.relname = 'classes' AND n.nspname = 'public'
      AND ft.relname = 'levels' AND fn.nspname = 'public'
      AND c.contype = 'f';
    
    RAISE NOTICE 'Found % foreign key constraints from classes to levels', constraint_count;
END $$;

-- Drop ALL foreign key constraints from classes to levels to start clean
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        JOIN pg_class ft ON c.confrelid = ft.oid
        JOIN pg_namespace fn ON ft.relnamespace = fn.oid
        WHERE t.relname = 'classes' AND n.nspname = 'public'
          AND ft.relname = 'levels' AND fn.nspname = 'public'
          AND c.contype = 'f'
    LOOP
        EXECUTE 'ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS ' || constraint_record.conname;
        RAISE NOTICE 'Dropped constraint: %', constraint_record.conname;
    END LOOP;
END $$;

-- Drop ALL foreign key constraints from levels to classes (if any exist)
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        JOIN pg_class ft ON c.confrelid = ft.oid
        JOIN pg_namespace fn ON ft.relnamespace = fn.oid
        WHERE t.relname = 'levels' AND n.nspname = 'public'
          AND ft.relname = 'classes' AND fn.nspname = 'public'
          AND c.contype = 'f'
    LOOP
        EXECUTE 'ALTER TABLE public.levels DROP CONSTRAINT IF EXISTS ' || constraint_record.conname;
        RAISE NOTICE 'Dropped reverse constraint: %', constraint_record.conname;
    END LOOP;
END $$;

-- Create the single, definitive foreign key relationship
ALTER TABLE public.classes 
ADD CONSTRAINT classes_level_id_fkey 
FOREIGN KEY (level_id) REFERENCES public.levels(id) ON DELETE SET NULL;

-- Add explicit comment to clarify the relationship
COMMENT ON CONSTRAINT classes_level_id_fkey ON public.classes IS 'Primary relationship: classes belong to levels';

-- Ensure the index exists for performance
CREATE INDEX IF NOT EXISTS idx_classes_level_id ON public.classes(level_id);

-- Add table comments to clarify the relationship direction
COMMENT ON TABLE public.classes IS 'Classes belong to academic levels via level_id';
COMMENT ON TABLE public.levels IS 'Academic levels can have multiple classes';

-- Refresh PostgREST schema cache (this helps with relationship detection)
NOTIFY pgrst, 'reload schema';