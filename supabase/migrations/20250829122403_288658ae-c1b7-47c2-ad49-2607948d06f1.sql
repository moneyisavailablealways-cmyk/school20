-- Fix security warnings by setting search_path for functions

-- Fix generate_invoice_number function
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Fix update_invoice_balance function
CREATE OR REPLACE FUNCTION public.update_invoice_balance()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;