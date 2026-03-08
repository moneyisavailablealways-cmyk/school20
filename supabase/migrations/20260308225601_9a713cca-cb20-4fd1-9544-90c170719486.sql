
CREATE TABLE public.admission_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  student_name text NOT NULL,
  parent_name text NOT NULL,
  parent_email text,
  parent_phone text,
  date_of_birth date,
  gender text,
  address text,
  previous_school text,
  class_applying_for text NOT NULL,
  application_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes text,
  documents_submitted boolean DEFAULT false,
  interview_scheduled boolean DEFAULT false,
  interview_date date,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view school admissions"
  ON public.admission_applications FOR SELECT
  TO authenticated
  USING (school_id = public.get_current_school_id() OR public.is_super_admin());

CREATE POLICY "Staff can insert admissions"
  ON public.admission_applications FOR INSERT
  TO authenticated
  WITH CHECK (school_id = public.get_current_school_id() AND public.is_staff_admin());

CREATE POLICY "Staff can update admissions"
  ON public.admission_applications FOR UPDATE
  TO authenticated
  USING (school_id = public.get_current_school_id() AND public.is_staff_admin());

CREATE POLICY "Staff can delete admissions"
  ON public.admission_applications FOR DELETE
  TO authenticated
  USING (school_id = public.get_current_school_id() AND public.is_staff_admin());

CREATE TRIGGER update_admission_applications_updated_at
  BEFORE UPDATE ON public.admission_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
