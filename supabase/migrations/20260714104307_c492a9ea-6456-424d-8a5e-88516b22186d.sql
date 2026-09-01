-- These functions are called by RLS policies or triggers, never by app users directly.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon, authenticated;

-- check_promo/increment_promo_use: callable by signed-in users only (used by /premium flow).
REVOKE EXECUTE ON FUNCTION public.check_promo(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_promo_use(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_promo(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_promo_use(uuid) TO authenticated;