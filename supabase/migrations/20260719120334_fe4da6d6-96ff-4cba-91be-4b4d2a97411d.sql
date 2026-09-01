
CREATE OR REPLACE FUNCTION public.mfa_ok(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT
        (two_factor_enabled = false)
        OR (mfa_verified_at IS NOT NULL AND mfa_verified_at > now() - interval '30 minutes')
      FROM public.security_prefs
      WHERE user_id = _user_id
    ),
    true
  );
$$;
