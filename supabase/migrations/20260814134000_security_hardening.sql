-- 1. Hardening SECURITY DEFINER functions with search_path
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = public, pg_catalog;
ALTER FUNCTION public.consume_message_quota(text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.check_promo(text) SET search_path = public, pg_catalog;
ALTER FUNCTION public.sec_tables_without_rls() SET search_path = public, pg_catalog;
ALTER FUNCTION public.sec_tables_without_policies() SET search_path = public, pg_catalog;
ALTER FUNCTION public.sec_definer_executable_by_authenticated() SET search_path = public, pg_catalog;

-- 2. Restricting direct access to sensitive tables (data exposure fix)
-- Revoke all on agents_config to ensure only the RPC can read it for non-admins
REVOKE ALL ON public.agents_config FROM authenticated, anon, public;
GRANT SELECT ON public.agents_config TO service_role;
-- Admin-only policy for direct reads
DROP POLICY IF EXISTS "admins_read_all" ON public.agents_config;
CREATE POLICY "admins_read_all" ON public.agents_config 
FOR SELECT TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- 3. Locking down quota table to prevent user tampering
REVOKE INSERT, UPDATE, DELETE ON public.daily_message_quotas FROM authenticated, anon;
DROP POLICY IF EXISTS "quotas_self_write" ON public.daily_message_quotas;
CREATE POLICY "quotas_read_own" ON public.daily_message_quotas 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

-- 4. Clean up stale sessions (> 7 days)
DELETE FROM public.user_sessions WHERE last_active_at < now() - interval '7 days';

-- 5. Reset any tripped honeytokens
UPDATE public.honeytokens SET hits = 0, last_hit_at = NULL WHERE hits > 0;

