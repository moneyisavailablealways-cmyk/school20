-- Fix FK to allow cascading deletes from student_fees
ALTER TABLE public.invoice_items
  DROP CONSTRAINT IF EXISTS invoice_items_student_fee_id_fkey;

ALTER TABLE public.invoice_items
  ADD CONSTRAINT invoice_items_student_fee_id_fkey
  FOREIGN KEY (student_fee_id)
  REFERENCES public.student_fees(id)
  ON DELETE CASCADE;

-- Safe deletion RPC for a single fee structure (scoped to caller's school)
CREATE OR REPLACE FUNCTION public.delete_fee_structure_cascade(p_fee_structure_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_school_id uuid;
  v_fs_school_id uuid;
  v_invoice_items_deleted int := 0;
  v_payments_deleted int := 0;
  v_invoices_deleted int := 0;
  v_student_fees_deleted int := 0;
BEGIN
  -- Permission check
  IF NOT (public.is_admin_or_principal() OR public.is_bursar_user()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  v_school_id := public.get_current_school_id();
  IF v_school_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'School context not found');
  END IF;

  SELECT school_id INTO v_fs_school_id FROM public.fee_structures WHERE id = p_fee_structure_id;
  IF v_fs_school_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fee structure not found');
  END IF;
  IF v_fs_school_id <> v_school_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cross-school deletion is not allowed');
  END IF;

  -- 1) Delete invoice_items tied to student_fees of this fee structure (same school)
  WITH del AS (
    DELETE FROM public.invoice_items ii
    USING public.student_fees sf
    WHERE ii.student_fee_id = sf.id
      AND sf.fee_structure_id = p_fee_structure_id
      AND sf.school_id = v_school_id
    RETURNING ii.id
  )
  SELECT count(*) INTO v_invoice_items_deleted FROM del;

  -- 2) Delete payments for invoices that become empty (only invoices belonging to this school AND only items from this FS)
  --    Strategy: delete invoices that have no remaining items and belong to this school
  WITH empty_invoices AS (
    SELECT i.id
    FROM public.invoices i
    WHERE i.school_id = v_school_id
      AND NOT EXISTS (SELECT 1 FROM public.invoice_items ii WHERE ii.invoice_id = i.id)
  ),
  del_pay AS (
    DELETE FROM public.payments p
    USING empty_invoices ei
    WHERE p.invoice_id = ei.id
    RETURNING p.id
  )
  SELECT count(*) INTO v_payments_deleted FROM del_pay;

  WITH del_inv AS (
    DELETE FROM public.invoices i
    WHERE i.school_id = v_school_id
      AND NOT EXISTS (SELECT 1 FROM public.invoice_items ii WHERE ii.invoice_id = i.id)
    RETURNING i.id
  )
  SELECT count(*) INTO v_invoices_deleted FROM del_inv;

  -- 3) Delete student_fees for this fee structure
  WITH del_sf AS (
    DELETE FROM public.student_fees sf
    WHERE sf.fee_structure_id = p_fee_structure_id
      AND sf.school_id = v_school_id
    RETURNING sf.id
  )
  SELECT count(*) INTO v_student_fees_deleted FROM del_sf;

  -- 4) Delete the fee structure
  DELETE FROM public.fee_structures
  WHERE id = p_fee_structure_id
    AND school_id = v_school_id;

  RETURN jsonb_build_object(
    'success', true,
    'invoice_items_deleted', v_invoice_items_deleted,
    'payments_deleted', v_payments_deleted,
    'invoices_deleted', v_invoices_deleted,
    'student_fees_deleted', v_student_fees_deleted
  );
END;
$$;

-- Update the reset function to also clear invoice_items and student_fees, in correct order
CREATE OR REPLACE FUNCTION public.reset_school_finance_data(p_school_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_school uuid;
  v_payments int := 0;
  v_invoice_items int := 0;
  v_invoices int := 0;
  v_student_fees int := 0;
  v_fee_structures int := 0;
  v_scholarships int := 0;
  v_overrides int := 0;
BEGIN
  IF NOT (public.is_admin_or_principal() OR public.is_bursar_user()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  v_caller_school := public.get_current_school_id();
  IF v_caller_school IS NULL OR v_caller_school <> p_school_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'School scope mismatch');
  END IF;

  WITH d AS (DELETE FROM public.payments WHERE school_id = p_school_id RETURNING id)
  SELECT count(*) INTO v_payments FROM d;

  WITH d AS (
    DELETE FROM public.invoice_items ii
    USING public.invoices i
    WHERE ii.invoice_id = i.id AND i.school_id = p_school_id
    RETURNING ii.id
  ) SELECT count(*) INTO v_invoice_items FROM d;

  WITH d AS (DELETE FROM public.invoices WHERE school_id = p_school_id RETURNING id)
  SELECT count(*) INTO v_invoices FROM d;

  WITH d AS (DELETE FROM public.student_fees WHERE school_id = p_school_id RETURNING id)
  SELECT count(*) INTO v_student_fees FROM d;

  WITH d AS (DELETE FROM public.fee_structures WHERE school_id = p_school_id RETURNING id)
  SELECT count(*) INTO v_fee_structures FROM d;

  BEGIN
    WITH d AS (DELETE FROM public.scholarships WHERE school_id = p_school_id RETURNING id)
    SELECT count(*) INTO v_scholarships FROM d;
  EXCEPTION WHEN undefined_table THEN v_scholarships := 0;
  END;

  BEGIN
    WITH d AS (DELETE FROM public.student_fee_overrides WHERE school_id = p_school_id RETURNING id)
    SELECT count(*) INTO v_overrides FROM d;
  EXCEPTION WHEN undefined_table THEN v_overrides := 0;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'payments', v_payments,
    'invoice_items', v_invoice_items,
    'invoices', v_invoices,
    'student_fees', v_student_fees,
    'fee_structures', v_fee_structures,
    'scholarships', v_scholarships,
    'overrides', v_overrides
  );
END;
$$;