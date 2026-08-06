CREATE OR REPLACE FUNCTION public.finalize_admission_approval(
  p_app_id uuid,
  p_auth_user_id uuid,
  p_parent_auth_user_id uuid DEFAULT NULL,
  p_class_id uuid DEFAULT NULL,
  p_stream_id uuid DEFAULT NULL,
  p_actor_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_app public.admission_applications;
  v_actor_profile public.profiles;
  v_school public.schools;
  v_year_id uuid;
  v_class_id uuid := p_class_id;
  v_profile_id uuid;
  v_student_id uuid;
  v_teacher_id uuid;
  v_parent_profile_id uuid;
  v_parent_details_id uuid;
  v_conflicting_parent_school_id uuid;
  v_adm_no text;
  v_emp_no text;
  v_first text;
  v_last text;
  v_parent_first text;
  v_parent_last text;
  v_parts text[];
  v_parent_parts text[];
  v_email text;
  v_parent_email text;
  v_level public.section_level_type;
  v_relationship text;
BEGIN
  IF p_app_id IS NULL OR p_auth_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application and auth user are required');
  END IF;

  SELECT * INTO v_app
  FROM public.admission_applications
  WHERE id = p_app_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application not found');
  END IF;

  SELECT * INTO v_actor_profile
  FROM public.profiles
  WHERE user_id = COALESCE(p_actor_user_id, auth.uid())
  LIMIT 1;

  IF v_actor_profile.id IS NULL OR v_actor_profile.school_id <> v_app.school_id OR v_actor_profile.role NOT IN ('admin', 'principal', 'head_teacher') THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not authorized to approve this application');
  END IF;

  IF v_app.stage = 'enrolled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application is already enrolled');
  END IF;

  IF v_app.application_type NOT IN ('learner', 'staff') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unsupported application type');
  END IF;

  SELECT * INTO v_school FROM public.schools WHERE id = v_app.school_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'School record was not found');
  END IF;

  v_level := CASE lower(COALESCE(v_school.school_level, 'secondary'))
    WHEN 'primary' THEN 'primary'::public.section_level_type
    WHEN 'nursery' THEN 'nursery'::public.section_level_type
    WHEN 'higher_institution' THEN 'higher_institution'::public.section_level_type
    ELSE 'secondary'::public.section_level_type
  END;

  v_parts := regexp_split_to_array(trim(v_app.student_name), '\s+');
  v_first := COALESCE(NULLIF(v_parts[1], ''), 'User');
  v_last := COALESCE(NULLIF(array_to_string(v_parts[2:], ' '), ''), '-');

  IF v_app.application_type = 'learner' THEN
    IF EXISTS (
      SELECT 1
      FROM public.students s
      WHERE s.school_id = v_app.school_id
        AND (
          (v_app.national_id IS NOT NULL AND s.national_id = v_app.national_id)
          OR (v_app.birth_certificate_number IS NOT NULL AND s.birth_certificate_number = v_app.birth_certificate_number)
        )
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'A learner with the same identification already exists');
    END IF;

    IF v_app.parent_national_id IS NOT NULL THEN
      SELECT p.id, p.school_id INTO v_parent_details_id, v_conflicting_parent_school_id
      FROM public.parents p
      WHERE p.national_id = v_app.parent_national_id
      LIMIT 1;

      IF v_parent_details_id IS NOT NULL AND v_conflicting_parent_school_id <> v_app.school_id THEN
        RAISE EXCEPTION 'A parent with this national ID already exists in another school';
      END IF;
    END IF;

    v_email := 'learner+' || v_app.id::text || '@school20.local';

    INSERT INTO public.profiles (user_id, first_name, last_name, email, phone, role, school_id, is_active, avatar_url)
    VALUES (p_auth_user_id, v_first, v_last, v_email, v_app.parent_phone, 'student', v_app.school_id, true, v_app.photo_url)
    ON CONFLICT (user_id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      role = EXCLUDED.role,
      school_id = EXCLUDED.school_id,
      is_active = true,
      avatar_url = EXCLUDED.avatar_url
    RETURNING id INTO v_profile_id;

    v_adm_no := public.generate_admission_number(v_app.school_id);

    SELECT id INTO v_year_id
    FROM public.academic_years
    WHERE school_id = v_app.school_id AND is_current = true
    LIMIT 1;

    IF v_class_id IS NULL AND NULLIF(v_app.class_applying_for, '') IS NOT NULL THEN
      SELECT id INTO v_class_id
      FROM public.classes
      WHERE school_id = v_app.school_id
        AND lower(name) = lower(v_app.class_applying_for)
      LIMIT 1;
    END IF;

    INSERT INTO public.students (
      profile_id, student_id, admission_number, admission_date,
      date_of_birth, gender, address, school_id, level_type,
      national_id, birth_certificate_number, current_class_id, enrollment_status
    ) VALUES (
      v_profile_id, v_adm_no, v_adm_no, CURRENT_DATE,
      COALESCE(v_app.date_of_birth, CURRENT_DATE), v_app.gender, v_app.address, v_app.school_id, v_level,
      v_app.national_id, v_app.birth_certificate_number, v_class_id, 'active'
    ) RETURNING id INTO v_student_id;

    IF v_class_id IS NOT NULL AND v_year_id IS NOT NULL THEN
      INSERT INTO public.student_enrollments (student_id, class_id, stream_id, academic_year_id, status, enrollment_date, school_id)
      VALUES (v_student_id, v_class_id, p_stream_id, v_year_id, 'active', CURRENT_DATE, v_app.school_id);
    END IF;

    IF COALESCE(v_app.medical_info, '{}'::jsonb) <> '{}'::jsonb THEN
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

    IF NULLIF(v_app.parent_name, '') IS NOT NULL THEN
      v_parent_parts := regexp_split_to_array(trim(v_app.parent_name), '\s+');
      v_parent_first := COALESCE(NULLIF(v_parent_parts[1], ''), 'Parent');
      v_parent_last := COALESCE(NULLIF(array_to_string(v_parent_parts[2:], ' '), ''), '-');
      v_parent_email := COALESCE(NULLIF(v_app.parent_email, ''), 'parent+' || v_app.id::text || '@school20.local');
      v_relationship := CASE lower(COALESCE(NULLIF(v_app.parent_relationship, ''), 'guardian'))
        WHEN 'father' THEN 'father'
        WHEN 'mother' THEN 'mother'
        WHEN 'guardian' THEN 'guardian'
        ELSE 'other'
      END;

      IF v_parent_details_id IS NULL THEN
        SELECT p.id INTO v_parent_profile_id
        FROM public.profiles p
        WHERE p.school_id = v_app.school_id
          AND lower(p.email) = lower(v_parent_email)
          AND p.role = 'parent'
        LIMIT 1;
      ELSE
        SELECT profile_id INTO v_parent_profile_id FROM public.parents WHERE id = v_parent_details_id;
      END IF;

      IF v_parent_profile_id IS NULL THEN
        INSERT INTO public.profiles (user_id, first_name, last_name, email, phone, role, school_id, is_active)
        VALUES (p_parent_auth_user_id, v_parent_first, v_parent_last, v_parent_email, v_app.parent_phone, 'parent', v_app.school_id, true)
        ON CONFLICT (user_id) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          role = EXCLUDED.role,
          school_id = EXCLUDED.school_id,
          is_active = true
        RETURNING id INTO v_parent_profile_id;
      END IF;

      IF v_parent_details_id IS NULL THEN
        INSERT INTO public.parents (profile_id, national_id, address, school_id)
        VALUES (v_parent_profile_id, v_app.parent_national_id, v_app.address, v_app.school_id)
        RETURNING id INTO v_parent_details_id;
      END IF;

      INSERT INTO public.parent_student_relationships (parent_id, student_id, relationship_type, school_id)
      VALUES (v_parent_profile_id, v_student_id, v_relationship, v_app.school_id)
      ON CONFLICT (parent_id, student_id) DO NOTHING;
    END IF;

    UPDATE public.admission_applications
    SET stage = 'enrolled', status = 'approved', reviewer_id = v_actor_profile.id, reviewed_at = now(),
        created_learner_id = v_student_id, created_parent_id = v_parent_profile_id, updated_at = now()
    WHERE id = v_app.id;

    RETURN jsonb_build_object('success', true, 'application_type', 'learner', 'student_id', v_student_id, 'profile_id', v_profile_id, 'parent_profile_id', v_parent_profile_id, 'admission_number', v_adm_no);
  END IF;

  v_email := COALESCE(NULLIF(v_app.parent_email, ''), 'staff+' || v_app.id::text || '@school20.local');

  INSERT INTO public.profiles (user_id, first_name, last_name, email, phone, role, school_id, is_active, avatar_url)
  VALUES (p_auth_user_id, v_first, v_last, v_email, v_app.parent_phone, 'teacher', v_app.school_id, true, v_app.photo_url)
  ON CONFLICT (user_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    school_id = EXCLUDED.school_id,
    is_active = true,
    avatar_url = EXCLUDED.avatar_url
  RETURNING id INTO v_profile_id;

  v_emp_no := 'EMP-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(v_app.id::text, '-', ''), 1, 6));

  INSERT INTO public.teachers (profile_id, employee_id, specialization, qualification, experience_years, joining_date, department, is_class_teacher)
  VALUES (
    v_profile_id,
    v_emp_no,
    COALESCE(v_app.staff_details->>'position', 'Teacher'),
    v_app.staff_details->>'qualification',
    COALESCE((v_app.staff_details->>'experience_years')::int, 0),
    CURRENT_DATE,
    COALESCE(v_app.staff_details->>'department', 'Teaching'),
    false
  ) RETURNING id INTO v_teacher_id;

  INSERT INTO public.staff_salaries (staff_profile_id, school_id, staff_type, base_salary, allowances, deductions, net_salary, effective_from, created_by)
  VALUES (v_profile_id, v_app.school_id, 'teaching', 0, 0, 0, 0, CURRENT_DATE, v_actor_profile.id)
  ON CONFLICT (school_id, staff_profile_id, effective_from) DO NOTHING;

  UPDATE public.admission_applications
  SET stage = 'enrolled', status = 'approved', reviewer_id = v_actor_profile.id, reviewed_at = now(),
      created_teacher_id = v_teacher_id, updated_at = now()
  WHERE id = v_app.id;

  RETURN jsonb_build_object('success', true, 'application_type', 'staff', 'teacher_id', v_teacher_id, 'profile_id', v_profile_id, 'employee_id', v_emp_no);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_admission_approval(uuid, uuid, uuid, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_admission_approval(uuid, uuid, uuid, uuid, uuid, uuid) TO service_role;