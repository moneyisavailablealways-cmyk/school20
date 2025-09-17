-- Remove the duplicate foreign key constraint causing the relationship ambiguity
-- Keep only the explicitly named constraint we just created

ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_level_id_fkey;

-- Verify only one foreign key remains
-- The fk_classes_level_id constraint should remain as the single relationship