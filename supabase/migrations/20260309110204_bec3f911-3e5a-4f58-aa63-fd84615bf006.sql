
ALTER TABLE public.school_stamps 
ADD COLUMN IF NOT EXISTS stamp_position_x numeric DEFAULT 85,
ADD COLUMN IF NOT EXISTS stamp_position_y numeric DEFAULT 75,
ADD COLUMN IF NOT EXISTS stamp_size text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS stamp_custom_scale numeric DEFAULT 100,
ADD COLUMN IF NOT EXISTS stamp_opacity numeric DEFAULT 70,
ADD COLUMN IF NOT EXISTS stamp_preset text DEFAULT 'near-signature',
ADD COLUMN IF NOT EXISTS stamp_rotation numeric DEFAULT -8;
