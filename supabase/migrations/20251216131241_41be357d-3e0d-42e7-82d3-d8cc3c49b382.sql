-- Report Card System Tables

-- Grading Configuration Table
CREATE TABLE public.grading_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  min_marks INTEGER NOT NULL,
  max_marks INTEGER NOT NULL,
  grade TEXT NOT NULL,
  grade_points NUMERIC(3,1) NOT NULL,
  remark TEXT,
  division_contribution INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Report Templates Table
CREATE TABLE public.report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL DEFAULT 'classic', -- classic, modern, minimal, colorful
  template_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Subject Submissions (Marks Entry)
CREATE TABLE public.subject_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES public.academic_years(id),
  term TEXT NOT NULL DEFAULT 'Term 1',
  marks NUMERIC(5,2),
  grade TEXT,
  grade_points NUMERIC(3,1),
  remark TEXT,
  teacher_initials TEXT,
  submitted_by UUID REFERENCES public.profiles(id),
  submitted_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, subject_id, academic_year_id, term)
);

-- Report Comments Table
CREATE TABLE public.report_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES public.academic_years(id),
  term TEXT NOT NULL,
  comment_type TEXT NOT NULL, -- class_teacher, head_teacher, principal
  comment TEXT NOT NULL,
  commenter_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, academic_year_id, term, comment_type)
);

-- Digital Signatures Table
CREATE TABLE public.report_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES public.academic_years(id),
  term TEXT NOT NULL,
  signer_role TEXT NOT NULL, -- class_teacher, head_teacher, principal
  signer_id UUID REFERENCES public.profiles(id),
  signer_name TEXT NOT NULL,
  signer_title TEXT,
  signature_hash TEXT,
  signed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, academic_year_id, term, signer_role)
);

-- Generated Reports Table
CREATE TABLE public.generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES public.academic_years(id),
  term TEXT NOT NULL,
  template_id UUID REFERENCES public.report_templates(id),
  overall_average NUMERIC(5,2),
  overall_grade TEXT,
  grade_points_average NUMERIC(3,2),
  o_level_division TEXT, -- I, II, III, IV, U
  best_eight_total INTEGER,
  promotion_status TEXT, -- promoted, conditional, repeat
  class_position INTEGER,
  stream_position INTEGER,
  total_students INTEGER,
  attendance_percentage NUMERIC(5,2),
  file_path TEXT,
  file_url TEXT,
  verification_code TEXT UNIQUE,
  status TEXT DEFAULT 'draft', -- draft, preview, finalized, printed
  version INTEGER DEFAULT 1,
  generated_by UUID REFERENCES public.profiles(id),
  generated_at TIMESTAMPTZ DEFAULT now(),
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, academic_year_id, term, version)
);

-- Report Audit Log
CREATE TABLE public.report_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id),
  actor_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL, -- submission, report, comment, signature
  target_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.grading_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for grading_config
CREATE POLICY "Admins can manage grading config" ON public.grading_config FOR ALL
  USING (is_admin_or_principal());

CREATE POLICY "Staff can view grading config" ON public.grading_config FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'principal', 'head_teacher', 'teacher')));

-- RLS Policies for report_templates
CREATE POLICY "Admins can manage templates" ON public.report_templates FOR ALL
  USING (is_admin_or_principal());

CREATE POLICY "Staff can view templates" ON public.report_templates FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'principal', 'head_teacher', 'teacher')));

-- RLS Policies for subject_submissions
CREATE POLICY "Teachers can manage their submissions" ON public.subject_submissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() 
      AND (p.role IN ('admin', 'principal', 'head_teacher') OR p.id = submitted_by)
    )
  );

CREATE POLICY "Admins can manage all submissions" ON public.subject_submissions FOR ALL
  USING (is_admin_or_principal());

CREATE POLICY "Teachers can view class submissions" ON public.subject_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'teacher'
    )
  );

-- RLS Policies for report_comments
CREATE POLICY "Staff can manage comments" ON public.report_comments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'principal', 'head_teacher', 'teacher')
    )
  );

CREATE POLICY "Parents can view their children's comments" ON public.report_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM parent_student_relationships psr
      JOIN profiles p ON p.id = psr.parent_id
      WHERE p.user_id = auth.uid() AND psr.student_id = report_comments.student_id
    )
  );

-- RLS Policies for report_signatures
CREATE POLICY "Staff can manage signatures" ON public.report_signatures FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'principal', 'head_teacher', 'teacher')
    )
  );

-- RLS Policies for generated_reports
CREATE POLICY "Staff can manage reports" ON public.generated_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'principal', 'head_teacher', 'teacher')
    )
  );

CREATE POLICY "Parents can view their children's reports" ON public.generated_reports FOR SELECT
  USING (
    status = 'finalized' AND EXISTS (
      SELECT 1 FROM parent_student_relationships psr
      JOIN profiles p ON p.id = psr.parent_id
      WHERE p.user_id = auth.uid() AND psr.student_id = generated_reports.student_id
    )
  );

CREATE POLICY "Students can view own reports" ON public.generated_reports FOR SELECT
  USING (
    status = 'finalized' AND EXISTS (
      SELECT 1 FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE p.user_id = auth.uid() AND s.id = generated_reports.student_id
    )
  );

-- RLS Policies for audit log
CREATE POLICY "Admins can view audit logs" ON public.report_audit_log FOR SELECT
  USING (is_admin_or_principal());

CREATE POLICY "System can insert audit logs" ON public.report_audit_log FOR INSERT
  WITH CHECK (true);

-- Create triggers for updated_at
CREATE TRIGGER update_grading_config_updated_at BEFORE UPDATE ON public.grading_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_templates_updated_at BEFORE UPDATE ON public.report_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subject_submissions_updated_at BEFORE UPDATE ON public.subject_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_comments_updated_at BEFORE UPDATE ON public.report_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_reports_updated_at BEFORE UPDATE ON public.generated_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default grading config (O-Level Uganda standard)
INSERT INTO public.grading_config (name, min_marks, max_marks, grade, grade_points, remark, division_contribution) VALUES
  ('Distinction 1', 90, 100, 'D1', 1.0, 'Excellent', 1),
  ('Distinction 2', 80, 89, 'D2', 2.0, 'Very Good', 2),
  ('Credit 3', 70, 79, 'C3', 3.0, 'Good', 3),
  ('Credit 4', 65, 69, 'C4', 4.0, 'Good', 4),
  ('Credit 5', 60, 64, 'C5', 5.0, 'Satisfactory', 5),
  ('Credit 6', 55, 59, 'C6', 6.0, 'Satisfactory', 6),
  ('Pass 7', 45, 54, 'P7', 7.0, 'Pass', 7),
  ('Pass 8', 35, 44, 'P8', 8.0, 'Pass', 8),
  ('Fail 9', 0, 34, 'F9', 9.0, 'Fail', 9);

-- Insert default templates
INSERT INTO public.report_templates (name, description, template_type, is_default) VALUES
  ('Classic Template', 'Traditional report card layout with clean design', 'classic', true),
  ('Modern Template', 'Contemporary design with charts and visuals', 'modern', false),
  ('Minimal Template', 'Simple and clean minimalist design', 'minimal', false),
  ('Colorful Template', 'Vibrant colors for primary schools', 'colorful', false);

-- Function to calculate grade from marks
CREATE OR REPLACE FUNCTION public.calculate_grade(p_marks NUMERIC)
RETURNS TABLE(grade TEXT, grade_points NUMERIC, remark TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT gc.grade, gc.grade_points, gc.remark
  FROM grading_config gc
  WHERE gc.is_active = true
    AND p_marks >= gc.min_marks 
    AND p_marks <= gc.max_marks
  LIMIT 1;
END;
$$;

-- Function to calculate O-Level division
CREATE OR REPLACE FUNCTION public.calculate_o_level_division(p_best_eight_total INTEGER)
RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_best_eight_total >= 8 AND p_best_eight_total <= 32 THEN RETURN 'I';
  ELSIF p_best_eight_total >= 33 AND p_best_eight_total <= 45 THEN RETURN 'II';
  ELSIF p_best_eight_total >= 46 AND p_best_eight_total <= 58 THEN RETURN 'III';
  ELSIF p_best_eight_total >= 59 AND p_best_eight_total <= 72 THEN RETURN 'IV';
  ELSE RETURN 'U';
  END IF;
END;
$$;

-- Function to log report actions
CREATE OR REPLACE FUNCTION public.log_report_action(
  p_action TEXT,
  p_target_type TEXT,
  p_target_id UUID,
  p_details JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_log_id UUID;
  v_profile RECORD;
BEGIN
  SELECT id, role INTO v_profile FROM profiles WHERE user_id = auth.uid();
  
  INSERT INTO report_audit_log (actor_id, actor_role, action, target_type, target_id, details)
  VALUES (v_profile.id, v_profile.role, p_action, p_target_type, p_target_id, p_details)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;