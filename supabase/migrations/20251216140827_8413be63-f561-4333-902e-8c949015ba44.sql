-- Enable RLS on school_settings if not already enabled
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can manage school settings" ON public.school_settings;
DROP POLICY IF EXISTS "Staff can view school settings" ON public.school_settings;

-- Create RLS policies for school_settings
CREATE POLICY "Admins can manage school settings"
ON public.school_settings
FOR ALL
USING (is_admin_or_principal())
WITH CHECK (is_admin_or_principal());

CREATE POLICY "Staff can view school settings"
ON public.school_settings
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.user_id = auth.uid()
  AND profiles.role IN ('admin', 'principal', 'head_teacher', 'teacher', 'bursar', 'librarian')
));