
-- =========================================================================
-- 1) Enforce "registrations disabled" server-side via handle_new_user
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  reg_enabled boolean;
BEGIN
  -- Founder is always allowed (bootstrap).
  IF LOWER(NEW.email) <> 'athulkrishna456727@gmail.com' THEN
    SELECT registration_enabled INTO reg_enabled
      FROM public.app_settings WHERE id = 1;
    IF reg_enabled IS NOT NULL AND reg_enabled = false THEN
      RAISE EXCEPTION 'Registrations are currently disabled'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_settings (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  IF LOWER(NEW.email) = 'athulkrishna456727@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- =========================================================================
-- 2) Server-verified 2FA: mfa_verified_at + mfa_ok() + policy gating
-- =========================================================================
ALTER TABLE public.security_prefs
  ADD COLUMN IF NOT EXISTS mfa_verified_at timestamptz;

CREATE OR REPLACE FUNCTION public.mfa_ok(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
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
    true  -- No prefs row => 2FA not enabled => allow.
  );
$$;

REVOKE EXECUTE ON FUNCTION public.mfa_ok(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mfa_ok(uuid) TO authenticated, service_role;

-- Gate sensitive owner data on mfa_ok. Admin read policies remain unchanged.
DROP POLICY IF EXISTS chats_owner_all ON public.chats;
CREATE POLICY chats_owner_all ON public.chats
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.mfa_ok(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.mfa_ok(auth.uid()));

DROP POLICY IF EXISTS messages_owner_all ON public.messages;
CREATE POLICY messages_owner_all ON public.messages
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.mfa_ok(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.mfa_ok(auth.uid()));

DROP POLICY IF EXISTS files_owner_all ON public.files;
CREATE POLICY files_owner_all ON public.files
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.mfa_ok(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.mfa_ok(auth.uid()));

DROP POLICY IF EXISTS memories_owner_all ON public.memories;
CREATE POLICY memories_owner_all ON public.memories
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.mfa_ok(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.mfa_ok(auth.uid()));

-- =========================================================================
-- 3) Lock down security-scan SECURITY DEFINER helpers to server-only
-- =========================================================================
REVOKE EXECUTE ON FUNCTION public.sec_tables_without_rls() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.sec_tables_without_policies() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.sec_definer_executable_by_authenticated() FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.sec_tables_without_rls() TO service_role;
GRANT EXECUTE ON FUNCTION public.sec_tables_without_policies() TO service_role;
GRANT EXECUTE ON FUNCTION public.sec_definer_executable_by_authenticated() TO service_role;
