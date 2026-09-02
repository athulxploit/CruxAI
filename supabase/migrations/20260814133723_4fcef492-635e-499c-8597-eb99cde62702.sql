
-- Revoke PUBLIC execute from all identified SD functions to satisfy the linter's anon/authenticated checks
REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() FROM public;
REVOKE EXECUTE ON FUNCTION public.increment_promo_use(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.purge_expired_chats() FROM public;
REVOKE EXECUTE ON FUNCTION public.redact_old_activity_log() FROM public;
REVOKE EXECUTE ON FUNCTION public.sec_tables_without_rls() FROM public;
REVOKE EXECUTE ON FUNCTION public.sec_tables_without_policies() FROM public;
REVOKE EXECUTE ON FUNCTION public.sec_definer_executable_by_authenticated() FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;
REVOKE EXECUTE ON FUNCTION public.sec_definers_missing_search_path() FROM public;
REVOKE EXECUTE ON FUNCTION public.sec_anon_selectable_tables() FROM public;
REVOKE EXECUTE ON FUNCTION public.sec_storage_public_buckets() FROM public;
REVOKE EXECUTE ON FUNCTION public.sec_tables_partial_policy_coverage() FROM public;

-- Also explicitly revoke from the remaining problematic ones
REVOKE EXECUTE ON FUNCTION public.sec_agents_config_leak() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sec_agents_config_leak() FROM anon;

REVOKE EXECUTE ON FUNCTION public.list_agents_public() FROM anon;

REVOKE EXECUTE ON FUNCTION public.sec_quotas_writable_by_users() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sec_quotas_writable_by_users() FROM anon;

-- Ensure service_role can still run them all
GRANT EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_promo_use(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_message_quota(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_expired_chats() TO service_role;
GRANT EXECUTE ON FUNCTION public.redact_old_activity_log() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_promo(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.sec_tables_without_rls() TO service_role;
GRANT EXECUTE ON FUNCTION public.sec_tables_without_policies() TO service_role;
GRANT EXECUTE ON FUNCTION public.sec_definer_executable_by_authenticated() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.sec_definers_missing_search_path() TO service_role;
GRANT EXECUTE ON FUNCTION public.sec_anon_selectable_tables() TO service_role;
GRANT EXECUTE ON FUNCTION public.sec_storage_public_buckets() TO service_role;
GRANT EXECUTE ON FUNCTION public.sec_agents_config_leak() TO service_role;
GRANT EXECUTE ON FUNCTION public.list_agents_public() TO service_role;
GRANT EXECUTE ON FUNCTION public.sec_quotas_writable_by_users() TO service_role;
GRANT EXECUTE ON FUNCTION public.sec_tables_partial_policy_coverage() TO service_role;
