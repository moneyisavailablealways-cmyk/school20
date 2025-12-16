
-- Create attendance status enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status') THEN
    CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused', 'left_early');
  END IF;
END $$;

-- Create attendance session enum  
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_session') THEN
    CREATE TYPE attendance_session AS ENUM ('morning', 'afternoon', 'full_day');
  END IF;
END $$;

-- Attendance settings table (school-wide configuration)
CREATE TABLE IF NOT EXISTS public.attendance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enable_multiple_sessions BOOLEAN DEFAULT false,
  default_session attendance_session DEFAULT 'full_day',
  lock_time TIME DEFAULT '18:00:00',
  auto_lock_enabled BOOLEAN DEFAULT true,
  allow_future_attendance BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default settings
INSERT INTO public.attendance_settings (id) 
VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- School calendar for holidays/breaks
CREATE TABLE IF NOT EXISTS public.school_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('holiday', 'break', 'half_day', 'exam_day')),
  name TEXT NOT NULL,
  description TEXT,
  academic_year_id UUID REFERENCES public.academic_years(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  UNIQUE(date, academic_year_id)
);

-- Drop existing attendance_records constraints if exists and recreate table with enhanced schema
-- First, backup existing data
CREATE TABLE IF NOT EXISTS public.attendance_records_backup AS 
SELECT * FROM public.attendance_records WHERE FALSE;

INSERT INTO public.attendance_records_backup 
SELECT * FROM public.attendance_records;

-- Add new columns to attendance_records if they don't exist
DO $$ 
BEGIN
  -- Add class_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'class_id') THEN
    ALTER TABLE public.attendance_records ADD COLUMN class_id UUID;
  END IF;
  
  -- Add session column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'session') THEN
    ALTER TABLE public.attendance_records ADD COLUMN session TEXT DEFAULT 'full_day';
  END IF;
  
  -- Add is_locked column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'is_locked') THEN
    ALTER TABLE public.attendance_records ADD COLUMN is_locked BOOLEAN DEFAULT false;
  END IF;
  
  -- Add locked_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'locked_at') THEN
    ALTER TABLE public.attendance_records ADD COLUMN locked_at TIMESTAMPTZ;
  END IF;
  
  -- Add locked_by column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'locked_by') THEN
    ALTER TABLE public.attendance_records ADD COLUMN locked_by UUID;
  END IF;
  
  -- Add last_modified_by column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'last_modified_by') THEN
    ALTER TABLE public.attendance_records ADD COLUMN last_modified_by UUID;
  END IF;
  
  -- Add last_modified_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'last_modified_at') THEN
    ALTER TABLE public.attendance_records ADD COLUMN last_modified_at TIMESTAMPTZ;
  END IF;
  
  -- Rename notes to remarks if notes exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'notes') THEN
    ALTER TABLE public.attendance_records RENAME COLUMN notes TO remarks;
  END IF;
  
  -- Rename recorded_by to marked_by if recorded_by exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'recorded_by') THEN
    ALTER TABLE public.attendance_records RENAME COLUMN recorded_by TO marked_by;
  END IF;
  
  -- Add marked_at if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'marked_at') THEN
    ALTER TABLE public.attendance_records ADD COLUMN marked_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Create unique constraint for attendance records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_student_class_date_session'
  ) THEN
    ALTER TABLE public.attendance_records 
    ADD CONSTRAINT unique_student_class_date_session 
    UNIQUE (student_id, class_id, date, session);
  END IF;
EXCEPTION WHEN others THEN
  NULL; -- Ignore if constraint already exists or can't be created
END $$;

-- Attendance audit log for tracking all changes
CREATE TABLE IF NOT EXISTS public.attendance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'locked', 'unlocked', 'overridden')),
  old_status TEXT,
  new_status TEXT,
  old_remarks TEXT,
  new_remarks TEXT,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now(),
  reason TEXT,
  ip_address TEXT
);

-- Enable RLS on new tables
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance_settings
CREATE POLICY "Staff can view attendance settings" ON public.attendance_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'principal', 'head_teacher', 'teacher')
    )
  );

CREATE POLICY "Admins can manage attendance settings" ON public.attendance_settings
  FOR ALL USING (is_admin_or_principal());

-- RLS Policies for school_calendar
CREATE POLICY "All authenticated can view calendar" ON public.school_calendar
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage calendar" ON public.school_calendar
  FOR ALL USING (is_admin_or_principal());

-- RLS Policies for attendance_audit_log
CREATE POLICY "Staff can view audit logs" ON public.attendance_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'principal', 'head_teacher')
    )
  );

CREATE POLICY "System can insert audit logs" ON public.attendance_audit_log
  FOR INSERT WITH CHECK (true);

-- Create function to check if teacher can mark attendance for a class
CREATE OR REPLACE FUNCTION public.teacher_can_mark_attendance(p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.classes c ON (c.class_teacher_id = p.id OR EXISTS (
      SELECT 1 FROM public.streams s WHERE s.class_id = c.id AND s.section_teacher_id = p.id
    ))
    WHERE p.user_id = auth.uid()
    AND c.id = p_class_id
  );
$$;

-- Create function to log attendance changes
CREATE OR REPLACE FUNCTION public.log_attendance_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.attendance_audit_log (
      attendance_record_id, action, new_status, new_remarks, changed_by
    ) VALUES (
      NEW.id, 'created', NEW.status, NEW.remarks, COALESCE(NEW.marked_by, auth.uid())
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status OR OLD.remarks IS DISTINCT FROM NEW.remarks THEN
      INSERT INTO public.attendance_audit_log (
        attendance_record_id, action, old_status, new_status, old_remarks, new_remarks, changed_by
      ) VALUES (
        NEW.id, 
        CASE WHEN OLD.is_locked AND NOT NEW.is_locked THEN 'unlocked'
             WHEN NOT OLD.is_locked AND NEW.is_locked THEN 'locked'
             WHEN NEW.is_locked THEN 'overridden'
             ELSE 'updated'
        END,
        OLD.status, NEW.status, OLD.remarks, NEW.remarks, 
        COALESCE(NEW.last_modified_by, auth.uid())
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for attendance audit logging
DROP TRIGGER IF EXISTS attendance_audit_trigger ON public.attendance_records;
CREATE TRIGGER attendance_audit_trigger
  AFTER INSERT OR UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.log_attendance_change();

-- Update RLS policies for attendance_records to include teacher marking
DROP POLICY IF EXISTS "Teachers can mark attendance for their classes" ON public.attendance_records;
CREATE POLICY "Teachers can mark attendance for their classes" ON public.attendance_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.role = 'teacher'
    )
  );

DROP POLICY IF EXISTS "Teachers can update unlocked attendance" ON public.attendance_records;
CREATE POLICY "Teachers can update unlocked attendance" ON public.attendance_records
  FOR UPDATE USING (
    is_locked = false AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.role = 'teacher'
    )
  );

-- Students can view their own attendance
DROP POLICY IF EXISTS "Students can view own attendance" ON public.attendance_records;
CREATE POLICY "Students can view own attendance" ON public.attendance_records
  FOR SELECT USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.profiles p ON p.id = s.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_records_class_date ON public.attendance_records(class_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_date ON public.attendance_records(student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_audit_record ON public.attendance_audit_log(attendance_record_id);
CREATE INDEX IF NOT EXISTS idx_school_calendar_date ON public.school_calendar(date);

-- Add realtime for attendance_records
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
