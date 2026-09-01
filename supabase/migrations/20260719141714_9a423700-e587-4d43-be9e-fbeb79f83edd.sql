
-- 1) agents_config: hide sensitive columns (system_prompt, backend_model) from non-admins.
--    Replace open SELECT policy with admin-only; expose safe columns via a SECURITY DEFINER RPC.
DROP POLICY IF EXISTS "agents_read_all" ON public.agents_config;

CREATE POLICY "agents_admin_read"
  ON public.agents_config
  FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

-- Safe listing for regular users (id, name, description, enabled, maintenance only)
CREATE OR REPLACE FUNCTION public.list_agents_public()
RETURNS TABLE(id text, name text, description text, enabled boolean, maintenance boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id::text,
         a.name::text,
         a.description::text,
         a.enabled,
         a.maintenance
    FROM public.agents_config a;
$$;

REVOKE ALL ON FUNCTION public.list_agents_public() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_agents_public() TO authenticated;

-- 2) daily_message_quotas: explicit deny for user writes; only SECURITY DEFINER
--    RPC (consume_message_quota, runs as owner) and service_role can write.
REVOKE INSERT, UPDATE, DELETE ON public.daily_message_quotas FROM authenticated, anon;

DROP POLICY IF EXISTS "quotas_no_client_writes" ON public.daily_message_quotas;
CREATE POLICY "quotas_no_client_writes"
  ON public.daily_message_quotas
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);
-- The existing SELECT policy ("Users read own quota") remains and takes precedence for SELECT.

-- 3) Detector for the agents_config leak so future scans catch regressions.
CREATE OR REPLACE FUNCTION public.sec_agents_config_leak()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agents_config'
      AND cmd = 'SELECT'
      AND 'authenticated' = ANY(roles)
      AND (qual IS NULL OR qual = 'true')
  );
$$;
REVOKE ALL ON FUNCTION public.sec_agents_config_leak() FROM PUBLIC;

-- 4) Detector for quota-tampering surface (any non-restrictive INSERT/UPDATE/DELETE policy
--    granting authenticated write access).
CREATE OR REPLACE FUNCTION public.sec_quotas_writable_by_users()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'daily_message_quotas'
      AND cmd IN ('INSERT','UPDATE','DELETE','ALL')
      AND 'authenticated' = ANY(roles)
      AND (with_check IS NULL OR with_check <> 'false')
  );
$$;
REVOKE ALL ON FUNCTION public.sec_quotas_writable_by_users() FROM PUBLIC;
