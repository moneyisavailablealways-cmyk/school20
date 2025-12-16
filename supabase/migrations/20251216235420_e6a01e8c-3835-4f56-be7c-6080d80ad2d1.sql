-- Update the prevent_non_admin_role_change trigger to allow service role operations
-- Service role is used by edge functions for admin operations
CREATE OR REPLACE FUNCTION public.prevent_non_admin_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Allow if auth.uid() is null (service role operations from edge functions)
    -- OR if the user is an admin/principal
    IF auth.uid() IS NOT NULL AND NOT public.is_admin_user() THEN
      RAISE EXCEPTION 'role changes are not allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;