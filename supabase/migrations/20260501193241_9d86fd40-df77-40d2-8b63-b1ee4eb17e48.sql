
-- ========== STAFF SALARIES (salary structure per staff) ==========
CREATE TABLE public.staff_salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  staff_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  staff_type TEXT NOT NULL DEFAULT 'teaching' CHECK (staff_type IN ('teaching','non_teaching')),
  base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  allowances NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_salary NUMERIC(12,2) GENERATED ALWAYS AS (base_salary + allowances - deductions) STORED,
  allowance_breakdown JSONB DEFAULT '{}'::jsonb,
  deduction_breakdown JSONB DEFAULT '{}'::jsonb,
  currency TEXT NOT NULL DEFAULT 'UGX',
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, staff_profile_id, effective_from)
);

CREATE INDEX idx_staff_salaries_school ON public.staff_salaries(school_id);
CREATE INDEX idx_staff_salaries_staff ON public.staff_salaries(staff_profile_id);

ALTER TABLE public.staff_salaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bursar/Admin manage salaries in their school"
ON public.staff_salaries FOR ALL
USING (school_id = public.get_current_school_id() AND public.is_bursar_user())
WITH CHECK (school_id = public.get_current_school_id() AND public.is_bursar_user());

CREATE POLICY "Staff can view own salary"
ON public.staff_salaries FOR SELECT
USING (staff_profile_id = public.get_current_profile_id());

CREATE TRIGGER update_staff_salaries_updated_at
BEFORE UPDATE ON public.staff_salaries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ========== SALARY PAYMENTS ==========
CREATE TABLE public.salary_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  staff_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  staff_salary_id UUID REFERENCES public.staff_salaries(id) ON DELETE SET NULL,
  pay_month INTEGER NOT NULL CHECK (pay_month BETWEEN 1 AND 12),
  pay_year INTEGER NOT NULL CHECK (pay_year BETWEEN 2000 AND 2100),
  base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  allowances NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'UGX',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash','bank_transfer','mobile_money','cheque')),
  reference_number TEXT,
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','pending','failed','cancelled')),
  payslip_number TEXT UNIQUE,
  notes TEXT,
  recorded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, staff_profile_id, pay_month, pay_year)
);

CREATE INDEX idx_salary_payments_school ON public.salary_payments(school_id);
CREATE INDEX idx_salary_payments_staff ON public.salary_payments(staff_profile_id);
CREATE INDEX idx_salary_payments_period ON public.salary_payments(pay_year, pay_month);

ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bursar/Admin manage salary payments in their school"
ON public.salary_payments FOR ALL
USING (school_id = public.get_current_school_id() AND public.is_bursar_user())
WITH CHECK (school_id = public.get_current_school_id() AND public.is_bursar_user());

CREATE POLICY "Staff can view own salary payments"
ON public.salary_payments FOR SELECT
USING (staff_profile_id = public.get_current_profile_id());

CREATE TRIGGER update_salary_payments_updated_at
BEFORE UPDATE ON public.salary_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-generate payslip number
CREATE OR REPLACE FUNCTION public.generate_payslip_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq INTEGER;
BEGIN
  IF NEW.payslip_number IS NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(payslip_number FROM 'PS-\d{4}-(\d+)') AS INTEGER)), 0) + 1
      INTO v_seq
    FROM public.salary_payments
    WHERE payslip_number LIKE 'PS-' || NEW.pay_year::text || '-%';
    NEW.payslip_number := 'PS-' || NEW.pay_year::text || '-' || LPAD(v_seq::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_payslip_number
BEFORE INSERT ON public.salary_payments
FOR EACH ROW EXECUTE FUNCTION public.generate_payslip_number();


-- ========== FEE REMINDERS LOG ==========
CREATE TABLE public.fee_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  parent_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  balance_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  reminder_type TEXT NOT NULL DEFAULT 'balance' CHECK (reminder_type IN ('balance','due_soon','overdue')),
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app','sms','whatsapp','email')),
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fee_reminders_school ON public.fee_reminders(school_id);
CREATE INDEX idx_fee_reminders_invoice ON public.fee_reminders(invoice_id);
CREATE INDEX idx_fee_reminders_parent ON public.fee_reminders(parent_profile_id);

ALTER TABLE public.fee_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bursar/Admin view reminders in their school"
ON public.fee_reminders FOR SELECT
USING (school_id = public.get_current_school_id() AND public.is_bursar_user());

CREATE POLICY "Bursar/Admin insert reminders in their school"
ON public.fee_reminders FOR INSERT
WITH CHECK (school_id = public.get_current_school_id() AND public.is_bursar_user());

CREATE POLICY "Parents view own reminders"
ON public.fee_reminders FOR SELECT
USING (parent_profile_id = public.get_current_profile_id());
