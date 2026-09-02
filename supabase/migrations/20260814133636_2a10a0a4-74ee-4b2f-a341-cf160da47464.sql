
-- 1. Tighten SECURITY DEFINER functions: Revoke public execute and ensure search_path is set (mitigating search_path attacks)
REVOKE EXECUTE ON FUNCTION public.consume_message_quota(text) FROM public;
GRANT EXECUTE ON FUNCTION public.consume_message_quota(text) TO authenticated, service_role;
ALTER FUNCTION public.consume_message_quota(text) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.check_promo(text) FROM public;
GRANT EXECUTE ON FUNCTION public.check_promo(text) TO authenticated, service_role;
ALTER FUNCTION public.check_promo(text) SET search_path = public;

-- 2. Audit and fix admin/security helper functions
REVOKE EXECUTE ON FUNCTION public.sec_agents_config_leak() FROM public;
GRANT EXECUTE ON FUNCTION public.sec_agents_config_leak() TO service_role;
ALTER FUNCTION public.sec_agents_config_leak() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.sec_quotas_writable_by_users() FROM public;
GRANT EXECUTE ON FUNCTION public.sec_quotas_writable_by_users() TO service_role;
ALTER FUNCTION public.sec_quotas_writable_by_users() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.list_agents_public() FROM public;
GRANT EXECUTE ON FUNCTION public.list_agents_public() TO authenticated, service_role;
ALTER FUNCTION public.list_agents_public() SET search_path = public;

-- Ensure all other SD functions have search_path set to prevent hijacking
ALTER FUNCTION public.prevent_profile_privilege_escalation() SET search_path = public;
ALTER FUNCTION public.increment_promo_use(uuid) SET search_path = public;
ALTER FUNCTION public.purge_expired_chats() SET search_path = public;
ALTER FUNCTION public.redact_old_activity_log() SET search_path = public;
ALTER FUNCTION public.sec_tables_without_rls() SET search_path = public;
ALTER FUNCTION public.sec_tables_without_policies() SET search_path = public;
ALTER FUNCTION public.sec_definer_executable_by_authenticated() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.sec_definers_missing_search_path() SET search_path = public;
ALTER FUNCTION public.sec_anon_selectable_tables() SET search_path = public;
ALTER FUNCTION public.sec_storage_public_buckets() SET search_path = public;
ALTER FUNCTION public.sec_tables_partial_policy_coverage() SET search_path = public;

-- 3. Fix app_user_connections table: It has RLS enabled but no policies and no grants.
-- Since it's RLS enabled, we MUST grant access to roles that should use it.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user_connections TO authenticated;
GRANT ALL ON public.app_user_connections TO service_role;

CREATE POLICY "Users can manage their own connections"
ON public.app_user_connections
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
