
-- =========================================================
-- PHASE 2a: Storage policies for admission-documents
-- Bucket is private. Path convention: {school_id}/{application_id}/{filename}
-- =========================================================

CREATE POLICY "admission docs: staff read own school"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'admission-documents'
    AND public.is_staff_admin()
    AND (storage.foldername(name))[1] = public.get_current_school_id()::text
  );

CREATE POLICY "admission docs: staff upload own school"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'admission-documents'
    AND public.is_staff_admin()
    AND (storage.foldername(name))[1] = public.get_current_school_id()::text
  );

CREATE POLICY "admission docs: staff delete own school"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'admission-documents'
    AND public.is_staff_admin()
    AND (storage.foldername(name))[1] = public.get_current_school_id()::text
  );

-- =========================================================
-- PHASE 2b: Approval engine
-- =========================================================

-- Helper: generate admission number ADM-YYYY-NNNN per school
CREATE OR REPLACE FUNCTION public.generate_admission_number(p_school_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  yr text := to_char(now(), 'YYYY');
  n int;
BEGIN
  SELECT COALESCE(MAX(CAST(regexp_replace(admission_number, '^ADM-\d{4}-', '') AS int)), 0) + 1
    INTO n
    FROM public.students
    WHERE school_id = p_school_id
      AND admission_number LIKE 'ADM-' || yr || '-%';
  RETURN 'ADM-' || yr || '-' || lpad(n::text, 5, '0');
END;
$$;

-- Helper: generate employee number EMP-YYYY-NNNN per school
CREATE OR REPLACE FUNCTION public.generate_employee_number(p_school_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  yr text := to_char(now(), 'YYYY');
  n int;
BEGIN
  SELECT COALESCE(MAX(CAST(regexp_replace(employee_id, '^EMP-\d{4}-', '') AS int)), 0) + 1
    INTO n
    FROM public.teachers
    WHERE school_id = p_school_id
      AND employee_id LIKE 'EMP-' || yr || '-%';
  RETURN 'EMP-' || yr || '-' || lpad(n::text, 5, '0');
END;
$$;

-- Simple stage transition
CREATE OR REPLACE FUNCTION public.transition_application(
  p_app_id uuid,
  p_new_stage text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app record;
BEGIN
  SELECT * INTO v_app FROM public.admission_applications WHERE id = p_app_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application not found');
  END IF;
  IF v_app.school_id <> public.get_current_school_id() OR NOT public.is_staff_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;
  IF p_new_stage NOT IN ('pending','under_review','interview_scheduled','entrance_exam','waiting_list','accepted','rejected','cancelled','enrolled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid stage');
  END IF;

  UPDATE public.admission_applications
     SET stage = p_new_stage,
         reviewer_id = COALESCE(reviewer_id, public.get_current_profile_id()),
         reviewed_at = COALESCE(reviewed_at, now()),
         status = CASE p_new_stage
                    WHEN 'accepted' THEN 'approved'
                    WHEN 'enrolled' THEN 'approved'
                    WHEN 'rejected' THEN 'rejected'
                    ELSE status
                  END,
         notes = CASE WHEN p_reason IS NULL THEN notes
                      ELSE COALESCE(notes || E'\n', '') || '[' || p_new_stage || '] ' || p_reason
                 END,
         updated_at = now()
   WHERE id = p_app_id;

  RETURN jsonb_build_object('success', true, 'stage', p_new_stage);
END;
$$;

-- Approval: creates real records
CREATE OR REPLACE FUNCTION public.approve_admission_application(
  p_app_id uuid,
  p_class_id uuid DEFAULT NULL,
  p_stream_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app          public.admission_applications;
  v_school       public.schools;
  v_year_id      uuid;
  v_class_id     uuid := p_class_id;
  v_stream_id    uuid := p_stream_id;
  v_profile_id   uuid;
  v_student_id   uuid;
  v_teacher_id   uuid;
  v_parent_id    uuid;
  v_parent_profile_id uuid;
  v_adm_no       text;
  v_emp_no       text;
  v_first        text;
  v_last         text;
  v_parts        text[];
  v_dup_count    int;
BEGIN
  SELECT * INTO v_app FROM public.admission_applications WHERE id = p_app_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application not found');
  END IF;
  IF v_app.school_id <> public.get_current_school_id() OR NOT public.is_staff_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;
  IF v_app.stage = 'enrolled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application already enrolled');
  END IF;

  SELECT * INTO v_school FROM public.schools WHERE id = v_app.school_id;

  -- Duplicate check
  IF v_app.application_type = 'learner' THEN
    SELECT COUNT(*) INTO v_dup_count
      FROM public.students s
     WHERE s.school_id = v_app.school_id
       AND (
         (v_app.national_id IS NOT NULL AND s.national_id = v_app.national_id)
         OR (v_app.birth_certificate_number IS NOT NULL AND s.birth_certificate_number = v_app.birth_certificate_number)
       );
    IF v_dup_count > 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'A learner with the same ID already exists');
    END IF;
  END IF;

  -- Split name
  v_parts := regexp_split_to_array(trim(v_app.student_name), '\s+');
  v_first := COALESCE(v_parts[1], v_app.student_name);
  v_last  := COALESCE(NULLIF(array_to_string(v_parts[2:], ' '), ''), '');

  IF v_app.application_type = 'learner' THEN
    -- profile (no user_id — login provisioned separately by edge function if enabled)
    INSERT INTO public.profiles (first_name, last_name, email, phone, role, school_id, is_active, avatar_url)
    VALUES (v_first, v_last, v_app.parent_email, v_app.parent_phone, 'student', v_app.school_id, true, v_app.photo_url)
    RETURNING id INTO v_profile_id;

    v_adm_no := public.generate_admission_number(v_app.school_id);

    -- Current academic year
    SELECT id INTO v_year_id FROM public.academic_years
     WHERE school_id = v_app.school_id AND is_current = true LIMIT 1;

    -- Resolve class if not provided: try match by name
    IF v_class_id IS NULL AND v_app.class_applying_for IS NOT NULL THEN
      SELECT id INTO v_class_id FROM public.classes
       WHERE school_id = v_app.school_id
         AND lower(name) = lower(v_app.class_applying_for)
       LIMIT 1;
    END IF;

    INSERT INTO public.students (
      profile_id, student_id, admission_number, admission_date,
      date_of_birth, gender, address, school_id,
      national_id, birth_certificate_number, current_class_id
    ) VALUES (
      v_profile_id, v_adm_no, v_adm_no, CURRENT_DATE,
      COALESCE(v_app.date_of_birth, CURRENT_DATE),
      v_app.gender, v_app.address, v_app.school_id,
      v_app.national_id, v_app.birth_certificate_number, v_class_id
    ) RETURNING id INTO v_student_id;

    -- Enrollment
    IF v_class_id IS NOT NULL AND v_year_id IS NOT NULL THEN
      INSERT INTO public.student_enrollments (student_id, class_id, stream_id, academic_year_id, status, enrollment_date)
      VALUES (v_student_id, v_class_id, v_stream_id, v_year_id, 'active', CURRENT_DATE);
    END IF;

    -- Medical
    IF v_app.medical_info <> '{}'::jsonb THEN
      INSERT INTO public.student_medical_info (student_id, school_id, blood_group, allergies, chronic_conditions, medications, doctor_name, doctor_phone, notes)
      VALUES (
        v_student_id, v_app.school_id,
        v_app.medical_info->>'blood_group',
        v_app.medical_info->>'allergies',
        v_app.medical_info->>'chronic_conditions',
        v_app.medical_info->>'medications',
        v_app.medical_info->>'doctor_name',
        v_app.medical_info->>'doctor_phone',
        v_app.medical_info->>'notes'
      );
    END IF;

    -- Emergency contacts
    IF jsonb_array_length(COALESCE(v_app.emergency_contacts, '[]'::jsonb)) > 0 THEN
      INSERT INTO public.student_emergency_contacts (student_id, school_id, contact_name, relationship, phone, alternate_phone, email, address, is_primary)
      SELECT
        v_student_id, v_app.school_id,
        c->>'name',
        c->>'relationship',
        c->>'phone',
        c->>'alternate_phone',
        c->>'email',
        c->>'address',
        COALESCE((c->>'is_primary')::boolean, false)
      FROM jsonb_array_elements(v_app.emergency_contacts) AS c;
    END IF;

    -- Parent (create or link)
    IF COALESCE(v_app.parent_name, '') <> '' THEN
      v_parent_profile_id := NULL;
      IF v_app.parent_email IS NOT NULL THEN
        SELECT p.id INTO v_parent_profile_id
          FROM public.profiles p
         WHERE p.school_id = v_app.school_id
           AND lower(p.email) = lower(v_app.parent_email)
           AND p.role = 'parent'
         LIMIT 1;
      END IF;
      IF v_parent_profile_id IS NULL AND v_app.parent_phone IS NOT NULL THEN
        SELECT p.id INTO v_parent_profile_id
          FROM public.profiles p
         WHERE p.school_id = v_app.school_id
           AND p.phone = v_app.parent_phone
           AND p.role = 'parent'
         LIMIT 1;
      END IF;

      IF v_parent_profile_id IS NULL THEN
        v_parts := regexp_split_to_array(trim(v_app.parent_name), '\s+');
        INSERT INTO public.profiles (first_name, last_name, email, phone, role, school_id, is_active)
        VALUES (
          COALESCE(v_parts[1], v_app.parent_name),
          COALESCE(NULLIF(array_to_string(v_parts[2:], ' '), ''), ''),
          v_app.parent_email, v_app.parent_phone, 'parent', v_app.school_id, true
        )
        RETURNING id INTO v_parent_profile_id;
      END IF;

      -- parents table row
      SELECT id INTO v_parent_id FROM public.parents WHERE profile_id = v_parent_profile_id;
      IF v_parent_id IS NULL THEN
        INSERT INTO public.parents (profile_id, national_id, address, school_id)
        VALUES (v_parent_profile_id, v_app.parent_national_id, v_app.address, v_app.school_id)
        RETURNING id INTO v_parent_id;
      END IF;

      INSERT INTO public.parent_student_relationships (parent_id, student_id, relationship, is_primary)
      VALUES (v_parent_profile_id, v_student_id, COALESCE(v_app.parent_relationship, 'guardian'), true)
      ON CONFLICT DO NOTHING;
    END IF;

    UPDATE public.admission_applications
       SET stage = 'enrolled', status = 'approved',
           created_learner_id = v_student_id,
           created_parent_id = v_parent_id,
           reviewer_id = COALESCE(reviewer_id, public.get_current_profile_id()),
           reviewed_at = COALESCE(reviewed_at, now()),
           updated_at = now()
     WHERE id = p_app_id;

    RETURN jsonb_build_object(
      'success', true,
      'application_type', 'learner',
      'student_id', v_student_id,
      'profile_id', v_profile_id,
      'parent_id', v_parent_id,
      'admission_number', v_adm_no
    );

  ELSIF v_app.application_type = 'staff' THEN
    INSERT INTO public.profiles (first_name, last_name, email, phone, role, school_id, is_active, avatar_url)
    VALUES (v_first, v_last, v_app.parent_email, v_app.parent_phone, 'teacher', v_app.school_id, true, v_app.photo_url)
    RETURNING id INTO v_profile_id;

    v_emp_no := public.generate_employee_number(v_app.school_id);

    INSERT INTO public.teachers (
      profile_id, employee_id, school_id, hire_date, qualification, experience_years, employment_status
    ) VALUES (
      v_profile_id, v_emp_no, v_app.school_id, CURRENT_DATE,
      v_app.staff_details->>'qualification',
      COALESCE((v_app.staff_details->>'experience_years')::int, 0),
      'active'
    ) RETURNING id INTO v_teacher_id;

    UPDATE public.admission_applications
       SET stage = 'enrolled', status = 'approved',
           created_teacher_id = v_teacher_id,
           reviewer_id = COALESCE(reviewer_id, public.get_current_profile_id()),
           reviewed_at = COALESCE(reviewed_at, now()),
           updated_at = now()
     WHERE id = p_app_id;

    RETURN jsonb_build_object(
      'success', true,
      'application_type', 'staff',
      'teacher_id', v_teacher_id,
      'profile_id', v_profile_id,
      'employee_id', v_emp_no
    );
  END IF;

  RETURN jsonb_build_object('success', false, 'error', 'Unknown application type');
END;
$$;

REVOKE ALL ON FUNCTION public.approve_admission_application(uuid, uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.approve_admission_application(uuid, uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.transition_application(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.transition_application(uuid, text, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.generate_admission_number(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.generate_admission_number(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.generate_employee_number(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.generate_employee_number(uuid) TO authenticated, service_role;
