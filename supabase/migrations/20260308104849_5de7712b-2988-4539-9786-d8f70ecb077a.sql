
-- Add fees_balance_override to report_card_fees for manual balance overrides per student
CREATE TABLE IF NOT EXISTS public.student_fee_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id),
  term TEXT NOT NULL,
  override_amount NUMERIC NOT NULL,
  override_reason TEXT,
  override_type TEXT NOT NULL DEFAULT 'manual' CHECK (override_type IN ('manual', 'bursary', 'waiver', 'discount')),
  created_by UUID REFERENCES public.profiles(id),
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, academic_year_id, term)
);

ALTER TABLE public.student_fee_overrides ENABLE ROW LEVEL SECURITY;

-- Only bursar/admin can manage overrides
CREATE POLICY "Bursar can manage student fee overrides"
  ON public.student_fee_overrides
  FOR ALL
  TO authenticated
  USING (public.is_bursar_user())
  WITH CHECK (public.is_bursar_user());

-- Staff can view overrides
CREATE POLICY "Staff can view student fee overrides"
  ON public.student_fee_overrides
  FOR SELECT
  TO authenticated
  USING (public.is_staff_admin());

-- Create audit log for fee override changes
CREATE TABLE IF NOT EXISTS public.fee_override_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_fee_override_id UUID REFERENCES public.student_fee_overrides(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.students(id),
  action TEXT NOT NULL,
  old_amount NUMERIC,
  new_amount NUMERIC,
  reason TEXT,
  changed_by UUID REFERENCES public.profiles(id),
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fee_override_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bursar can view fee override audit"
  ON public.fee_override_audit_log
  FOR SELECT
  TO authenticated
  USING (public.is_bursar_user() OR public.is_staff_admin());

CREATE POLICY "System can insert fee override audit"
  ON public.fee_override_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_bursar_user());

-- Trigger to auto-log overrides
CREATE OR REPLACE FUNCTION public.log_fee_override_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO fee_override_audit_log (student_fee_override_id, student_id, action, new_amount, reason, changed_by, school_id)
    VALUES (NEW.id, NEW.student_id, 'created', NEW.override_amount, NEW.override_reason, NEW.created_by, NEW.school_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO fee_override_audit_log (student_fee_override_id, student_id, action, old_amount, new_amount, reason, changed_by, school_id)
    VALUES (NEW.id, NEW.student_id, 'updated', OLD.override_amount, NEW.override_amount, NEW.override_reason, NEW.created_by, NEW.school_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO fee_override_audit_log (student_fee_override_id, student_id, action, old_amount, reason, changed_by, school_id)
    VALUES (OLD.id, OLD.student_id, 'deleted', OLD.override_amount, 'Override removed', OLD.created_by, OLD.school_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_log_fee_override_change
  AFTER INSERT OR UPDATE OR DELETE ON public.student_fee_overrides
  FOR EACH ROW EXECUTE FUNCTION public.log_fee_override_change();

-- Function to calculate student fees balance
CREATE OR REPLACE FUNCTION public.calculate_student_fees_balance(
  p_student_id UUID,
  p_academic_year_id UUID,
  p_term TEXT DEFAULT NULL
)
RETURNS TABLE(
  total_fees_required NUMERIC,
  total_scholarship NUMERIC,
  adjusted_fees NUMERIC,
  total_paid NUMERIC,
  balance NUMERIC,
  has_override BOOLEAN,
  override_amount NUMERIC,
  final_balance NUMERIC
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_fees NUMERIC := 0;
  v_total_scholarship NUMERIC := 0;
  v_adjusted NUMERIC := 0;
  v_total_paid NUMERIC := 0;
  v_balance NUMERIC := 0;
  v_has_override BOOLEAN := false;
  v_override_amount NUMERIC := 0;
  v_final_balance NUMERIC := 0;
BEGIN
  -- Get total fees from invoices for this student and academic year
  SELECT COALESCE(SUM(i.total_amount), 0)
  INTO v_total_fees
  FROM invoices i
  WHERE i.student_id = p_student_id
    AND i.academic_year_id = p_academic_year_id
    AND i.status != 'cancelled';

  -- Get total scholarship/bursary amounts
  SELECT COALESCE(SUM(ss.amount), 0)
  INTO v_total_scholarship
  FROM student_scholarships ss
  WHERE ss.student_id = p_student_id
    AND ss.academic_year_id = p_academic_year_id
    AND ss.status = 'active';

  -- Calculate adjusted fees
  v_adjusted := GREATEST(v_total_fees - v_total_scholarship, 0);

  -- Get total payments made
  SELECT COALESCE(SUM(p.amount), 0)
  INTO v_total_paid
  FROM payments p
  WHERE p.student_id = p_student_id
    AND p.status = 'completed';

  -- Calculate balance
  v_balance := GREATEST(v_adjusted - v_total_paid, 0);

  -- Check for manual override
  SELECT true, sfo.override_amount
  INTO v_has_override, v_override_amount
  FROM student_fee_overrides sfo
  WHERE sfo.student_id = p_student_id
    AND sfo.academic_year_id = p_academic_year_id
    AND (p_term IS NULL OR sfo.term = p_term);

  IF NOT FOUND THEN
    v_has_override := false;
    v_override_amount := 0;
  END IF;

  -- Final balance: use override if present, else calculated
  v_final_balance := CASE WHEN v_has_override THEN v_override_amount ELSE v_balance END;

  RETURN QUERY SELECT v_total_fees, v_total_scholarship, v_adjusted, v_total_paid, v_balance, v_has_override, v_override_amount, v_final_balance;
END;
$$;
