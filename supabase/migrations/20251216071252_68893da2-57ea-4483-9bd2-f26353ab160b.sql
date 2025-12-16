-- 1) Helper: can the logged-in parent view a student's profile row?
CREATE OR REPLACE FUNCTION public.is_parent_of_student_profile(target_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parent_student_relationships psr
    JOIN public.profiles parent_p ON parent_p.id = psr.parent_id
    JOIN public.students s ON s.id = psr.student_id
    WHERE parent_p.user_id = auth.uid()
      AND s.profile_id = target_profile_id
  );
$$;

-- 2) Fix recursive parent policy on profiles
DROP POLICY IF EXISTS "Parents can view their children's profiles" ON public.profiles;
CREATE POLICY "Parents can view their children's profiles"
ON public.profiles
FOR SELECT
USING (public.is_parent_of_student_profile(id));

-- 3) Replace recursive UPDATE policy with a non-recursive one + a trigger that blocks role changes
DROP POLICY IF EXISTS "Users can update their own profile (no role changes)" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Prevent non-admins from changing role via trigger (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.prevent_non_admin_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_admin_user() THEN
      RAISE EXCEPTION 'role changes are not allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_non_admin_role_change ON public.profiles;
CREATE TRIGGER trg_prevent_non_admin_role_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_non_admin_role_change();
