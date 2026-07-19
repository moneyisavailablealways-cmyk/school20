
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
  v_email        text;
  v_parent_email text;
  v_level        public.section_level_type;
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
  v_level := CASE lower(COALESCE(v_school.school_level, 'secondary'))
                WHEN 'primary' THEN 'primary'::public.section_level_type
                WHEN 'nursery' THEN 'primary'::public.section_level_type
                ELSE 'secondary'::public.section_level_type
             END;

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

  v_parts := regexp_split_to_array(trim(v_app.student_name), '\s+');
  v_first := COALESCE(v_parts[1], v_app.student_name);
  v_last  := COALESCE(NULLIF(array_to_string(v_parts[2:], ' '), ''), '-');

  v_email := COALESCE(
    NULLIF(v_app.parent_email, ''),
    'learner+' || v_app.id::text || '@school20.local'
  );

  IF v_app.application_type = 'learner' THEN
    INSERT INTO public.profiles (first_name, last_name, email, phone, role, school_id, is_active, avatar_url)
    VALUES (v_first, v_last, v_email, v_app.parent_phone, 'student', v_app.school_id, true, v_app.photo_url)
    RETURNING id INTO v_profile_id;

    v_adm_no := public.generate_admission_number(v_app.school_id);

    SELECT id INTO v_year_id FROM public.academic_years
     WHERE school_id = v_app.school_id AND is_current = true LIMIT 1;

    IF v_class_id IS NULL AND v_app.class_applying_for IS NOT NULL THEN
      SELECT id INTO v_class_id FROM public.classes
       WHERE school_id = v_app.school_id
         AND lower(name) = lower(v_app.class_applying_for)
       LIMIT 1;
    END IF;

    INSERT INTO public.students (
      profile_id, student_id, admission_number, admission_date,
      date_of_birth, gender, address, school_id, level_type,
      national_id, birth_certificate_number, current_class_id
    ) VALUES (
      v_profile_id, v_adm_no, v_adm_no, CURRENT_DATE,
      COALESCE(v_app.date_of_birth, CURRENT_DATE),
      v_app.gender, v_app.address, v_app.school_id, v_level,
      v_app.national_id, v_app.birth_certificate_number, v_class_id
    ) RETURNING id INTO v_student_id;

    IF v_class_id IS NOT NULL AND v_year_id IS NOT NULL THEN
      INSERT INTO public.student_enrollments (student_id, class_id, stream_id, academic_year_id, status, enrollment_date)
      VALUES (v_student_id, v_class_id, v_stream_id, v_year_id, 'active', CURRENT_DATE);
    END IF;

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

    IF jsonb_array_length(COALESCE(v_app.emergency_contacts, '[]'::jsonb)) > 0 THEN
      INSERT INTO public.student_emergency_contacts (student_id, school_id, contact_name, relationship, phone, alternate_phone, email, address, is_primary)
      SELECT v_student_id, v_app.school_id,
        c->>'name', c->>'relationship', c->>'phone', c->>'alternate_phone',
        c->>'email', c->>'address', COALESCE((c->>'is_primary')::boolean, false)
      FROM jsonb_array_elements(v_app.emergency_contacts) AS c;
    END IF;

    IF COALESCE(v_app.parent_name, '') <> '' THEN
      v_parent_profile_id := NULL;
      v_parent_email := COALESCE(NULLIF(v_app.parent_email, ''), 'parent+' || v_app.id::text || '@school20.local');

      IF v_app.parent_email IS NOT NULL THEN
        SELECT p.id INTO v_parent_profile_id
          FROM public.profiles p
         WHERE p.school_id = v_app.school_id
           AND lower(p.email) = lower(v_app.parent_email)
           AND p.role = 'parent' LIMIT 1;
      END IF;
      IF v_parent_profile_id IS NULL AND v_app.parent_phone IS NOT NULL THEN
        SELECT p.id INTO v_parent_profile_id
          FROM public.profiles p
         WHERE p.school_id = v_app.school_id
           AND p.phone = v_app.parent_phone
           AND p.role = 'parent' LIMIT 1;
      END IF;

      IF v_parent_profile_id IS NULL THEN
        v_parts := regexp_split_to_array(trim(v_app.parent_name), '\s+');
        INSERT INTO public.profiles (first_name, last_name, email, phone, role, school_id, is_active)
        VALUES (
          COALESCE(v_parts[1], v_app.parent_name),
          COALESCE(NULLIF(array_to_string(v_parts[2:], ' '), ''), '-'),
          v_parent_email, v_app.parent_phone, 'parent', v_app.school_id, true
        )
        RETURNING id INTO v_parent_profile_id;
      END IF;

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

    RETURN jsonb_build_object('success', true, 'application_type', 'learner',
      'student_id', v_student_id, 'profile_id', v_profile_id,
      'parent_id', v_parent_id, 'admission_number', v_adm_no);

  ELSIF v_app.application_type = 'staff' THEN
    INSERT INTO public.profiles (first_name, last_name, email, phone, role, school_id, is_active, avatar_url)
    VALUES (v_first, v_last, v_email, v_app.parent_phone, 'teacher', v_app.school_id, true, v_app.photo_url)
    RETURNING id INTO v_profile_id;

    v_emp_no := public.generate_employee_number(v_app.school_id);

    INSERT INTO public.teachers (
      profile_id, employee_id, school_id, hire_date, qualification, experience_years, employment_status, level_type
    ) VALUES (
      v_profile_id, v_emp_no, v_app.school_id, CURRENT_DATE,
      v_app.staff_details->>'qualification',
      COALESCE((v_app.staff_details->>'experience_years')::int, 0),
      'active', v_level
    ) RETURNING id INTO v_teacher_id;

    UPDATE public.admission_applications
       SET stage = 'enrolled', status = 'approved',
           created_teacher_id = v_teacher_id,
           reviewer_id = COALESCE(reviewer_id, public.get_current_profile_id()),
           reviewed_at = COALESCE(reviewed_at, now()),
           updated_at = now()
     WHERE id = p_app_id;

    RETURN jsonb_build_object('success', true, 'application_type', 'staff',
      'teacher_id', v_teacher_id, 'profile_id', v_profile_id, 'employee_id', v_emp_no);
  END IF;

  RETURN jsonb_build_object('success', false, 'error', 'Unknown application type');
END;
$$;
