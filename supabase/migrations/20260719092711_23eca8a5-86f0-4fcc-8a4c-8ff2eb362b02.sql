
-- 1. Revoke EXECUTE on SECURITY DEFINER functions that must never be callable by end users.
-- These run only from triggers or pg_cron; authenticated/anon should not invoke them directly.
REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_expired_chats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.redact_old_activity_log() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_chat_expiry() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_promo_use(uuid) FROM PUBLIC, anon, authenticated;

-- Keep these callable — used by client/server code with auth context:
--   public.has_role(uuid, app_role)  -> used in RLS predicates via SECURITY DEFINER, must remain executable
--   public.consume_message_quota(text) -> called from server fns as the user
--   public.check_promo(text) -> called from premium page

-- 2. Defense-in-depth: explicit deny of client writes to user_roles.
-- Only service_role (edge/admin paths) may modify role assignments.
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;

DROP POLICY IF EXISTS "no_client_role_writes" ON public.user_roles;
CREATE POLICY "no_client_role_writes"
  ON public.user_roles
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
