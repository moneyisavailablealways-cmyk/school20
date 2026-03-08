
-- =============================================
-- Phase 1: Digital Signatures, School Stamps, Auto-Comments, Promotions, Report Card Fees
-- =============================================

-- 1. Digital Signatures (reusable per user, not per report)
CREATE TABLE public.digital_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  signature_type TEXT NOT NULL DEFAULT 'drawn', -- 'drawn' or 'typed'
  signature_data TEXT NOT NULL, -- base64 image data for drawn, or text for typed
  font_family TEXT, -- font used for typed signatures
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, school_id)
);

ALTER TABLE public.digital_signatures ENABLE ROW LEVEL SECURITY;

-- Users can manage their own signature
CREATE POLICY "Users can view own signature" ON public.digital_signatures
  FOR SELECT TO authenticated
  USING (user_id = public.get_current_profile_id());

CREATE POLICY "Users can insert own signature" ON public.digital_signatures
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.get_current_profile_id() AND school_id = public.get_current_school_id());

CREATE POLICY "Users can update own signature" ON public.digital_signatures
  FOR UPDATE TO authenticated
  USING (user_id = public.get_current_profile_id())
  WITH CHECK (user_id = public.get_current_profile_id());

CREATE POLICY "Users can delete own signature" ON public.digital_signatures
  FOR DELETE TO authenticated
  USING (user_id = public.get_current_profile_id());

-- Staff can view signatures for report generation (read-only)
CREATE POLICY "Staff can view school signatures" ON public.digital_signatures
  FOR SELECT TO authenticated
  USING (school_id = public.get_current_school_id() AND public.is_staff_admin());

-- 2. School Stamps
CREATE TABLE public.school_stamps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  stamp_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id)
);

ALTER TABLE public.school_stamps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view school stamp" ON public.school_stamps
  FOR SELECT TO authenticated
  USING (school_id = public.get_current_school_id());

CREATE POLICY "Admin can manage school stamp" ON public.school_stamps
  FOR ALL TO authenticated
  USING (school_id = public.get_current_school_id() AND public.is_staff_admin())
  WITH CHECK (school_id = public.get_current_school_id() AND public.is_staff_admin());

-- 3. Auto Comment Rules (grade range -> comment mapping)
CREATE TABLE public.auto_comment_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  min_score NUMERIC(5,2) NOT NULL,
  max_score NUMERIC(5,2) NOT NULL,
  comment_text TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.auto_comment_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view auto comment rules" ON public.auto_comment_rules
  FOR SELECT TO authenticated
  USING (school_id = public.get_current_school_id());

CREATE POLICY "Admin can manage auto comment rules" ON public.auto_comment_rules
  FOR ALL TO authenticated
  USING (school_id = public.get_current_school_id() AND public.is_staff_admin())
  WITH CHECK (school_id = public.get_current_school_id() AND public.is_staff_admin());

-- 4. Promotion Records
CREATE TABLE public.promotion_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  from_class_id UUID REFERENCES public.classes(id),
  to_class_id UUID REFERENCES public.classes(id),
  from_academic_year_id UUID NOT NULL REFERENCES public.academic_years(id),
  to_academic_year_id UUID REFERENCES public.academic_years(id),
  promotion_type TEXT NOT NULL DEFAULT 'promoted', -- 'promoted', 'repeated', 'completed', 'transferred'
  promoted_by UUID REFERENCES public.profiles(id),
  promoted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.promotion_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view promotion records" ON public.promotion_records
  FOR SELECT TO authenticated
  USING (school_id = public.get_current_school_id());

CREATE POLICY "Admin can manage promotion records" ON public.promotion_records
  FOR ALL TO authenticated
  USING (school_id = public.get_current_school_id() AND public.is_staff_admin())
  WITH CHECK (school_id = public.get_current_school_id() AND public.is_staff_admin());

-- 5. Report Card Fees (bursar fills per class/term)
CREATE TABLE public.report_card_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id),
  term TEXT NOT NULL,
  class_id UUID REFERENCES public.classes(id),
  fees_balance_note TEXT,
  fees_next_term TEXT,
  other_requirements TEXT,
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, academic_year_id, term, class_id)
);

ALTER TABLE public.report_card_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and bursar can view report card fees" ON public.report_card_fees
  FOR SELECT TO authenticated
  USING (school_id = public.get_current_school_id());

CREATE POLICY "Bursar and admin can manage report card fees" ON public.report_card_fees
  FOR ALL TO authenticated
  USING (school_id = public.get_current_school_id() AND (public.is_staff_admin() OR public.is_bursar_user()))
  WITH CHECK (school_id = public.get_current_school_id() AND (public.is_staff_admin() OR public.is_bursar_user()));

-- 6. Function to get auto-comment based on score
CREATE OR REPLACE FUNCTION public.get_auto_comment(p_school_id UUID, p_score NUMERIC)
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT comment_text
  FROM auto_comment_rules
  WHERE school_id = p_school_id
    AND is_active = true
    AND p_score >= min_score
    AND p_score <= max_score
  ORDER BY priority DESC
  LIMIT 1;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_digital_signatures_updated_at
  BEFORE UPDATE ON public.digital_signatures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_school_stamps_updated_at
  BEFORE UPDATE ON public.school_stamps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_auto_comment_rules_updated_at
  BEFORE UPDATE ON public.auto_comment_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_report_card_fees_updated_at
  BEFORE UPDATE ON public.report_card_fees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
