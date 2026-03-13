
-- Add missing columns to schools table for registration
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS motto text;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS po_box text;
