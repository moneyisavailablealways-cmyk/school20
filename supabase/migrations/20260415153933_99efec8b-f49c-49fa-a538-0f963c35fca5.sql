
-- Table to store student reference signatures
CREATE TABLE public.student_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  signature_data TEXT NOT NULL, -- base64 encoded signature image
  is_active BOOLEAN NOT NULL DEFAULT true,
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure only one active signature per student
CREATE UNIQUE INDEX idx_student_signatures_active ON public.student_signatures (student_id) WHERE is_active = true;
CREATE INDEX idx_student_signatures_school ON public.student_signatures (school_id);

ALTER TABLE public.student_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage student signatures"
  ON public.student_signatures FOR ALL
  USING (public.is_staff_admin() AND school_id = public.get_current_school_id())
  WITH CHECK (public.is_staff_admin() AND school_id = public.get_current_school_id());

CREATE POLICY "Teachers can manage student signatures"
  ON public.student_signatures FOR ALL
  USING (public.is_teacher() AND school_id = public.get_current_school_id())
  WITH CHECK (public.is_teacher() AND school_id = public.get_current_school_id());

CREATE TRIGGER update_student_signatures_updated_at
  BEFORE UPDATE ON public.student_signatures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table to log signature-based attendance
CREATE TABLE public.signature_attendance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id),
  signature_image TEXT NOT NULL, -- base64 captured signature
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'present',
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('verified', 'mismatch', 'pending', 'no_reference')),
  similarity_score NUMERIC(5,2), -- 0-100 score for future AI matching
  parent_notified BOOLEAN NOT NULL DEFAULT false,
  notification_details JSONB DEFAULT '{}'::jsonb,
  marked_by UUID REFERENCES public.profiles(id),
  metadata JSONB DEFAULT '{}'::jsonb, -- for future biometric/face data
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, date) -- one check-in per student per day
);

CREATE INDEX idx_sig_attendance_school_date ON public.signature_attendance_logs (school_id, date);
CREATE INDEX idx_sig_attendance_student ON public.signature_attendance_logs (student_id);
CREATE INDEX idx_sig_attendance_verification ON public.signature_attendance_logs (verification_status);

ALTER TABLE public.signature_attendance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage signature attendance"
  ON public.signature_attendance_logs FOR ALL
  USING (public.is_staff_admin() AND school_id = public.get_current_school_id())
  WITH CHECK (public.is_staff_admin() AND school_id = public.get_current_school_id());

CREATE POLICY "Teachers can manage signature attendance"
  ON public.signature_attendance_logs FOR ALL
  USING (public.is_teacher() AND school_id = public.get_current_school_id())
  WITH CHECK (public.is_teacher() AND school_id = public.get_current_school_id());

CREATE POLICY "Students view own signature attendance"
  ON public.signature_attendance_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.profiles p ON p.id = s.profile_id
      WHERE s.id = signature_attendance_logs.student_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents view child signature attendance"
  ON public.signature_attendance_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_student_relationships psr
      JOIN public.profiles p ON p.id = psr.parent_id
      WHERE psr.student_id = signature_attendance_logs.student_id
      AND p.user_id = auth.uid()
    )
  );

CREATE TRIGGER update_sig_attendance_updated_at
  BEFORE UPDATE ON public.signature_attendance_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
