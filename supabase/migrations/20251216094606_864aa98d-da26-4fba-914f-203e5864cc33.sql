-- Create teacher attendance status enum
CREATE TYPE public.teacher_attendance_status AS ENUM ('present', 'absent', 'late', 'sick_leave', 'vacation_leave', 'half_day', 'pending_approval');

-- Create teacher attendance records table
CREATE TABLE public.teacher_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status teacher_attendance_status NOT NULL DEFAULT 'present',
  check_in_time TIME,
  check_out_time TIME,
  late_reason TEXT,
  remarks TEXT,
  marked_by UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  is_self_marked BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT true,
  academic_year_id UUID REFERENCES public.academic_years(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(teacher_id, date)
);

-- Create teacher leave requests table
CREATE TABLE public.teacher_leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('sick_leave', 'vacation_leave', 'half_day', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create teacher attendance audit log
CREATE TABLE public.teacher_attendance_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_record_id UUID NOT NULL REFERENCES public.teacher_attendance(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_status teacher_attendance_status,
  new_status teacher_attendance_status,
  changed_by UUID NOT NULL REFERENCES public.profiles(id),
  changed_at TIMESTAMPTZ DEFAULT now(),
  reason TEXT
);

-- Enable RLS
ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_attendance_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teacher_attendance
CREATE POLICY "Staff admin can manage teacher attendance"
ON public.teacher_attendance FOR ALL
USING (is_staff_admin());

CREATE POLICY "Teachers can view their own attendance"
ON public.teacher_attendance FOR SELECT
USING (teacher_id = get_current_profile_id());

CREATE POLICY "Teachers can self-mark attendance"
ON public.teacher_attendance FOR INSERT
WITH CHECK (teacher_id = get_current_profile_id() AND is_self_marked = true AND is_approved = false);

-- RLS Policies for teacher_leave_requests
CREATE POLICY "Staff admin can manage leave requests"
ON public.teacher_leave_requests FOR ALL
USING (is_staff_admin());

CREATE POLICY "Teachers can manage their own leave requests"
ON public.teacher_leave_requests FOR ALL
USING (teacher_id = get_current_profile_id());

-- RLS Policies for teacher_attendance_audit
CREATE POLICY "Staff admin can view audit logs"
ON public.teacher_attendance_audit FOR SELECT
USING (is_staff_admin());

CREATE POLICY "System can insert audit logs"
ON public.teacher_attendance_audit FOR INSERT
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_teacher_attendance_teacher_date ON public.teacher_attendance(teacher_id, date);
CREATE INDEX idx_teacher_attendance_date ON public.teacher_attendance(date);
CREATE INDEX idx_teacher_leave_requests_teacher ON public.teacher_leave_requests(teacher_id);
CREATE INDEX idx_teacher_leave_requests_status ON public.teacher_leave_requests(status);

-- Trigger for updated_at
CREATE TRIGGER update_teacher_attendance_updated_at
  BEFORE UPDATE ON public.teacher_attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teacher_leave_requests_updated_at
  BEFORE UPDATE ON public.teacher_leave_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log teacher attendance changes
CREATE OR REPLACE FUNCTION public.log_teacher_attendance_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.teacher_attendance_audit (
      attendance_record_id, action, old_status, new_status, changed_by
    ) VALUES (
      NEW.id, 'status_changed', OLD.status, NEW.status, COALESCE(NEW.approved_by, auth.uid())
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for audit logging
CREATE TRIGGER log_teacher_attendance_changes
  AFTER UPDATE ON public.teacher_attendance
  FOR EACH ROW EXECUTE FUNCTION log_teacher_attendance_change();