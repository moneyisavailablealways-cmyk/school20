
-- Student risk assessments table
CREATE TABLE public.student_risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id),
  term text NOT NULL,
  school_id uuid REFERENCES public.schools(id),
  risk_level text NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_score numeric NOT NULL DEFAULT 0,
  avg_marks numeric,
  prev_avg_marks numeric,
  marks_trend numeric, -- negative = declining
  failing_subjects integer DEFAULT 0,
  below_average_subjects integer DEFAULT 0,
  total_subjects integer DEFAULT 0,
  attendance_rate numeric,
  insights jsonb DEFAULT '[]'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  assessed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(student_id, academic_year_id, term)
);

ALTER TABLE public.student_risk_assessments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "School isolation for student_risk_assessments"
ON public.student_risk_assessments FOR ALL
USING (school_id = get_current_school_id() OR school_id IS NULL OR is_super_admin());

CREATE POLICY "Staff can view risk assessments"
ON public.student_risk_assessments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.user_id = auth.uid()
  AND profiles.role IN ('admin', 'principal', 'head_teacher', 'teacher')
));

CREATE POLICY "System can manage risk assessments"
ON public.student_risk_assessments FOR ALL
USING (is_staff_admin())
WITH CHECK (is_staff_admin());

-- Function to calculate risk for all students in a school
CREATE OR REPLACE FUNCTION public.calculate_student_risk(
  p_school_id uuid,
  p_academic_year_id uuid,
  p_term text,
  p_prev_term text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_student RECORD;
  v_count integer := 0;
  v_avg numeric;
  v_prev_avg numeric;
  v_trend numeric;
  v_failing integer;
  v_below_avg integer;
  v_total integer;
  v_class_avg numeric;
  v_risk_score numeric;
  v_risk_level text;
  v_insights jsonb;
  v_recommendations jsonb;
  v_attendance numeric;
BEGIN
  -- Loop through all active students in the school
  FOR v_student IN
    SELECT s.id as student_id, se.class_id
    FROM students s
    JOIN student_enrollments se ON se.student_id = s.id AND se.status = 'active'
    WHERE s.school_id = p_school_id
  LOOP
    v_insights := '[]'::jsonb;
    v_recommendations := '[]'::jsonb;

    -- Current term average
    SELECT COALESCE(AVG(ss.marks), 0), COUNT(*),
           COUNT(*) FILTER (WHERE ss.marks < 40),
           COUNT(*) FILTER (WHERE ss.marks < 50)
    INTO v_avg, v_total, v_failing, v_below_avg
    FROM subject_submissions ss
    WHERE ss.student_id = v_student.student_id
      AND ss.academic_year_id = p_academic_year_id
      AND ss.term = p_term
      AND ss.status = 'approved';

    -- Skip students with no marks
    IF v_total = 0 THEN CONTINUE; END IF;

    -- Previous term average
    v_prev_avg := NULL;
    v_trend := 0;
    IF p_prev_term IS NOT NULL THEN
      SELECT AVG(ss.marks)
      INTO v_prev_avg
      FROM subject_submissions ss
      WHERE ss.student_id = v_student.student_id
        AND ss.academic_year_id = p_academic_year_id
        AND ss.term = p_prev_term
        AND ss.status = 'approved';

      IF v_prev_avg IS NOT NULL AND v_prev_avg > 0 THEN
        v_trend := v_avg - v_prev_avg;
      END IF;
    END IF;

    -- Class average for comparison
    SELECT AVG(ss2.marks)
    INTO v_class_avg
    FROM subject_submissions ss2
    JOIN student_enrollments se2 ON se2.student_id = ss2.student_id AND se2.status = 'active'
    WHERE se2.class_id = v_student.class_id
      AND ss2.academic_year_id = p_academic_year_id
      AND ss2.term = p_term
      AND ss2.status = 'approved';

    -- Attendance rate
    SELECT 
      CASE WHEN COUNT(*) > 0 
        THEN (COUNT(*) FILTER (WHERE ar.status = 'present') * 100.0 / COUNT(*))
        ELSE NULL 
      END
    INTO v_attendance
    FROM attendance_records ar
    WHERE ar.student_id = v_student.student_id
      AND ar.school_id = p_school_id;

    -- Calculate risk score (0-100, higher = worse)
    v_risk_score := 0;

    -- Factor 1: Low average marks (max 30 points)
    IF v_avg < 30 THEN v_risk_score := v_risk_score + 30;
    ELSIF v_avg < 40 THEN v_risk_score := v_risk_score + 25;
    ELSIF v_avg < 50 THEN v_risk_score := v_risk_score + 15;
    ELSIF v_avg < 60 THEN v_risk_score := v_risk_score + 5;
    END IF;

    -- Factor 2: Declining trend (max 25 points)
    IF v_trend < -15 THEN v_risk_score := v_risk_score + 25;
    ELSIF v_trend < -10 THEN v_risk_score := v_risk_score + 20;
    ELSIF v_trend < -5 THEN v_risk_score := v_risk_score + 10;
    ELSIF v_trend < 0 THEN v_risk_score := v_risk_score + 5;
    END IF;

    -- Factor 3: Failing subjects (max 25 points)
    IF v_failing >= 4 THEN v_risk_score := v_risk_score + 25;
    ELSIF v_failing >= 3 THEN v_risk_score := v_risk_score + 20;
    ELSIF v_failing >= 2 THEN v_risk_score := v_risk_score + 15;
    ELSIF v_failing >= 1 THEN v_risk_score := v_risk_score + 8;
    END IF;

    -- Factor 4: Below class average (max 10 points)
    IF v_class_avg IS NOT NULL AND v_avg < (v_class_avg - 15) THEN
      v_risk_score := v_risk_score + 10;
    ELSIF v_class_avg IS NOT NULL AND v_avg < (v_class_avg - 5) THEN
      v_risk_score := v_risk_score + 5;
    END IF;

    -- Factor 5: Low attendance (max 10 points)
    IF v_attendance IS NOT NULL THEN
      IF v_attendance < 60 THEN v_risk_score := v_risk_score + 10;
      ELSIF v_attendance < 75 THEN v_risk_score := v_risk_score + 7;
      ELSIF v_attendance < 85 THEN v_risk_score := v_risk_score + 3;
      END IF;
    END IF;

    -- Classify risk level
    IF v_risk_score >= 65 THEN v_risk_level := 'critical';
    ELSIF v_risk_score >= 40 THEN v_risk_level := 'high';
    ELSIF v_risk_score >= 20 THEN v_risk_level := 'medium';
    ELSE v_risk_level := 'low';
    END IF;

    -- Generate insights
    IF v_trend < -10 THEN
      v_insights := v_insights || jsonb_build_array('Performance declining significantly compared to previous term');
    ELSIF v_trend < -5 THEN
      v_insights := v_insights || jsonb_build_array('Slight performance decline from previous term');
    ELSIF v_trend > 10 THEN
      v_insights := v_insights || jsonb_build_array('Performance improving significantly');
    END IF;

    IF v_failing > 0 THEN
      v_insights := v_insights || jsonb_build_array('Failing ' || v_failing || ' subject(s) (below 40%)');
    END IF;

    IF v_class_avg IS NOT NULL AND v_avg < v_class_avg THEN
      v_insights := v_insights || jsonb_build_array('Performing below class average by ' || ROUND(v_class_avg - v_avg, 1) || ' points');
    END IF;

    IF v_attendance IS NOT NULL AND v_attendance < 80 THEN
      v_insights := v_insights || jsonb_build_array('Low attendance rate: ' || ROUND(v_attendance, 1) || '%');
    END IF;

    -- Generate recommendations
    IF v_risk_level IN ('high', 'critical') THEN
      v_recommendations := v_recommendations || jsonb_build_array('Schedule parent meeting to discuss academic performance');
      v_recommendations := v_recommendations || jsonb_build_array('Assign extra coaching sessions');
    END IF;
    IF v_failing > 0 THEN
      v_recommendations := v_recommendations || jsonb_build_array('Provide subject-specific tutoring for failing subjects');
    END IF;
    IF v_trend < -5 THEN
      v_recommendations := v_recommendations || jsonb_build_array('Investigate causes of performance decline');
    END IF;
    IF v_attendance IS NOT NULL AND v_attendance < 80 THEN
      v_recommendations := v_recommendations || jsonb_build_array('Address attendance issues with student and parents');
    END IF;

    -- Upsert risk assessment
    INSERT INTO student_risk_assessments (
      student_id, academic_year_id, term, school_id,
      risk_level, risk_score, avg_marks, prev_avg_marks, marks_trend,
      failing_subjects, below_average_subjects, total_subjects,
      attendance_rate, insights, recommendations, assessed_at
    ) VALUES (
      v_student.student_id, p_academic_year_id, p_term, p_school_id,
      v_risk_level, v_risk_score, ROUND(v_avg, 1), ROUND(v_prev_avg, 1), ROUND(v_trend, 1),
      v_failing, v_below_avg, v_total,
      ROUND(v_attendance, 1), v_insights, v_recommendations, now()
    )
    ON CONFLICT (student_id, academic_year_id, term)
    DO UPDATE SET
      risk_level = EXCLUDED.risk_level,
      risk_score = EXCLUDED.risk_score,
      avg_marks = EXCLUDED.avg_marks,
      prev_avg_marks = EXCLUDED.prev_avg_marks,
      marks_trend = EXCLUDED.marks_trend,
      failing_subjects = EXCLUDED.failing_subjects,
      below_average_subjects = EXCLUDED.below_average_subjects,
      total_subjects = EXCLUDED.total_subjects,
      attendance_rate = EXCLUDED.attendance_rate,
      insights = EXCLUDED.insights,
      recommendations = EXCLUDED.recommendations,
      assessed_at = EXCLUDED.assessed_at,
      updated_at = now();

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
