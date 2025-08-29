-- Create fee structures table
CREATE TABLE public.fee_structures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  academic_year_id UUID REFERENCES public.academic_years(id),
  class_id UUID REFERENCES public.classes(id),
  amount DECIMAL(10,2) NOT NULL,
  fee_type TEXT NOT NULL CHECK (fee_type IN ('tuition', 'registration', 'exam', 'library', 'transport', 'uniform', 'activity', 'other')),
  payment_schedule TEXT NOT NULL CHECK (payment_schedule IN ('one_time', 'termly', 'monthly', 'weekly')),
  due_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student fees table (individual fee assignments)
CREATE TABLE public.student_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  fee_structure_id UUID REFERENCES public.fee_structures(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  scholarship_amount DECIMAL(10,2) DEFAULT 0,
  final_amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partially_paid', 'paid', 'overdue')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, fee_structure_id)
);

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES public.academic_years(id),
  total_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  balance_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partially_paid', 'paid', 'overdue', 'cancelled')),
  due_date DATE NOT NULL,
  issued_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoice items table
CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  student_fee_id UUID REFERENCES public.student_fees(id),
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_reference TEXT NOT NULL UNIQUE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'mobile_money', 'online', 'card')),
  payment_date DATE DEFAULT CURRENT_DATE,
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  notes TEXT,
  processed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scholarships table
CREATE TABLE public.scholarships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed_amount')),
  value DECIMAL(10,2) NOT NULL,
  academic_year_id UUID REFERENCES public.academic_years(id),
  criteria TEXT,
  max_recipients INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student scholarships table
CREATE TABLE public.student_scholarships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  scholarship_id UUID REFERENCES public.scholarships(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES public.academic_years(id),
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'terminated')),
  awarded_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, scholarship_id, academic_year_id)
);

-- Enable Row Level Security
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_scholarships ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for fee_structures
CREATE POLICY "Bursar can manage fee structures" ON public.fee_structures
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('admin', 'principal', 'bursar')
  ));

CREATE POLICY "Staff can view fee structures" ON public.fee_structures
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('admin', 'principal', 'bursar', 'head_teacher', 'teacher')
  ));

-- Create RLS policies for student_fees
CREATE POLICY "Bursar can manage student fees" ON public.student_fees
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('admin', 'principal', 'bursar')
  ));

CREATE POLICY "Parents can view their children's fees" ON public.student_fees
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.parent_student_relationships psr
    JOIN public.profiles p ON p.id = psr.parent_id
    WHERE p.user_id = auth.uid() AND psr.student_id = student_fees.student_id
  ));

-- Create RLS policies for invoices
CREATE POLICY "Bursar can manage invoices" ON public.invoices
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('admin', 'principal', 'bursar')
  ));

CREATE POLICY "Parents can view their children's invoices" ON public.invoices
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.parent_student_relationships psr
    JOIN public.profiles p ON p.id = psr.parent_id
    WHERE p.user_id = auth.uid() AND psr.student_id = invoices.student_id
  ));

-- Create RLS policies for invoice_items
CREATE POLICY "Bursar can manage invoice items" ON public.invoice_items
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('admin', 'principal', 'bursar')
  ));

-- Create RLS policies for payments
CREATE POLICY "Bursar can manage payments" ON public.payments
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('admin', 'principal', 'bursar')
  ));

CREATE POLICY "Parents can view their children's payments" ON public.payments
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.parent_student_relationships psr
    JOIN public.profiles p ON p.id = psr.parent_id
    WHERE p.user_id = auth.uid() AND psr.student_id = payments.student_id
  ));

-- Create RLS policies for scholarships
CREATE POLICY "Bursar can manage scholarships" ON public.scholarships
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('admin', 'principal', 'bursar')
  ));

CREATE POLICY "Staff can view scholarships" ON public.scholarships
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('admin', 'principal', 'bursar', 'head_teacher', 'teacher')
  ));

-- Create RLS policies for student_scholarships
CREATE POLICY "Bursar can manage student scholarships" ON public.student_scholarships
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('admin', 'principal', 'bursar')
  ));

CREATE POLICY "Parents can view their children's scholarships" ON public.student_scholarships
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.parent_student_relationships psr
    JOIN public.profiles p ON p.id = psr.parent_id
    WHERE p.user_id = auth.uid() AND psr.student_id = student_scholarships.student_id
  ));

-- Create updated_at triggers
CREATE TRIGGER update_fee_structures_updated_at
  BEFORE UPDATE ON public.fee_structures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_fees_updated_at
  BEFORE UPDATE ON public.student_fees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scholarships_updated_at
  BEFORE UPDATE ON public.scholarships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_scholarships_updated_at
  BEFORE UPDATE ON public.student_scholarships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 6) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.invoices
  WHERE invoice_number LIKE current_year || '-%';
  
  RETURN current_year || '-' || LPAD(next_number::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Create function to update invoice balance
CREATE OR REPLACE FUNCTION public.update_invoice_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.invoices 
    SET 
      paid_amount = COALESCE((
        SELECT SUM(amount) 
        FROM public.payments 
        WHERE invoice_id = NEW.invoice_id AND status = 'completed'
      ), 0),
      balance_amount = total_amount - COALESCE((
        SELECT SUM(amount) 
        FROM public.payments 
        WHERE invoice_id = NEW.invoice_id AND status = 'completed'
      ), 0),
      status = CASE 
        WHEN total_amount <= COALESCE((
          SELECT SUM(amount) 
          FROM public.payments 
          WHERE invoice_id = NEW.invoice_id AND status = 'completed'
        ), 0) THEN 'paid'
        WHEN COALESCE((
          SELECT SUM(amount) 
          FROM public.payments 
          WHERE invoice_id = NEW.invoice_id AND status = 'completed'
        ), 0) > 0 THEN 'partially_paid'
        ELSE 'pending'
      END,
      updated_at = now()
    WHERE id = NEW.invoice_id;
    
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    UPDATE public.invoices 
    SET 
      paid_amount = COALESCE((
        SELECT SUM(amount) 
        FROM public.payments 
        WHERE invoice_id = OLD.invoice_id AND status = 'completed'
      ), 0),
      balance_amount = total_amount - COALESCE((
        SELECT SUM(amount) 
        FROM public.payments 
        WHERE invoice_id = OLD.invoice_id AND status = 'completed'
      ), 0),
      status = CASE 
        WHEN total_amount <= COALESCE((
          SELECT SUM(amount) 
          FROM public.payments 
          WHERE invoice_id = OLD.invoice_id AND status = 'completed'
        ), 0) THEN 'paid'
        WHEN COALESCE((
          SELECT SUM(amount) 
          FROM public.payments 
          WHERE invoice_id = OLD.invoice_id AND status = 'completed'
        ), 0) > 0 THEN 'partially_paid'
        ELSE 'pending'
      END,
      updated_at = now()
    WHERE id = OLD.invoice_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update invoice balance when payments change
CREATE TRIGGER update_invoice_balance_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_invoice_balance();