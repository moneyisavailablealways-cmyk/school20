
-- Safe per-school finance data reset function
-- Only Admin or Bursar of that school can invoke; deletes records (not tables) scoped to school_id.
CREATE OR REPLACE FUNCTION public.reset_school_finance_data(p_school_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_caller_school uuid;
  v_invoices int := 0;
  v_payments int := 0;
  v_scholarships int := 0;
  v_fee_structures int := 0;
  v_overrides int := 0;
  v_reminders int := 0;
  v_invoice_items int := 0;
  v_audit int := 0;
BEGIN
  -- Authorize: caller must be admin/principal/bursar of this school
  SELECT role, school_id INTO v_caller_role, v_caller_school
  FROM public.profiles
  WHERE user_id = auth.uid();

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_caller_role NOT IN ('admin', 'principal', 'bursar') THEN
    RAISE EXCEPTION 'Only admins, principals, or bursars can reset finance data';
  END IF;

  IF v_caller_school IS DISTINCT FROM p_school_id THEN
    RAISE EXCEPTION 'You can only reset finance data for your own school';
  END IF;

  -- Delete in dependency order, scoped strictly by school_id
  DELETE FROM public.fee_override_audit_log WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_audit = ROW_COUNT;

  DELETE FROM public.student_fee_overrides WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_overrides = ROW_COUNT;

  DELETE FROM public.fee_reminders WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_reminders = ROW_COUNT;

  DELETE FROM public.payments
   WHERE invoice_id IN (SELECT id FROM public.invoices WHERE school_id = p_school_id)
      OR student_id IN (SELECT id FROM public.students WHERE school_id = p_school_id);
  GET DIAGNOSTICS v_payments = ROW_COUNT;

  DELETE FROM public.invoice_items
   WHERE invoice_id IN (SELECT id FROM public.invoices WHERE school_id = p_school_id);
  GET DIAGNOSTICS v_invoice_items = ROW_COUNT;

  DELETE FROM public.invoices WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_invoices = ROW_COUNT;

  DELETE FROM public.student_scholarships WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_scholarships = ROW_COUNT;

  DELETE FROM public.scholarships WHERE school_id = p_school_id;

  DELETE FROM public.fee_structures WHERE school_id = p_school_id;
  GET DIAGNOSTICS v_fee_structures = ROW_COUNT;

  PERFORM public.log_activity(
    'finance_data_reset',
    'Finance data reset for school',
    auth.uid(),
    jsonb_build_object(
      'school_id', p_school_id,
      'invoices', v_invoices,
      'invoice_items', v_invoice_items,
      'payments', v_payments,
      'scholarships', v_scholarships,
      'fee_structures', v_fee_structures,
      'overrides', v_overrides,
      'reminders', v_reminders,
      'audit_log', v_audit
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'invoices', v_invoices,
    'invoice_items', v_invoice_items,
    'payments', v_payments,
    'scholarships', v_scholarships,
    'fee_structures', v_fee_structures,
    'overrides', v_overrides,
    'reminders', v_reminders,
    'audit_log', v_audit
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reset_school_finance_data(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.reset_school_finance_data(uuid) TO authenticated;
