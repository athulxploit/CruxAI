CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO service_role;

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
BEGIN
  IF private.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.messages_used IS DISTINCT FROM OLD.messages_used
     OR NEW.storage_used_bytes IS DISTINCT FROM OLD.storage_used_bytes THEN
    RAISE EXCEPTION 'Not permitted to modify privileged profile fields';
  END IF;
  RETURN NEW;
END;
$function$;

ALTER POLICY "activity_admin_read" ON public.activity_log
  USING (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "activity_admin_update" ON public.activity_log
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "adminlog insert admin" ON public.admin_logs
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "adminlog read admin" ON public.admin_logs
  USING (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "agents_admin_write" ON public.agents_config
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "announce admin write" ON public.announcements
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "app_settings_admin_write" ON public.app_settings
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "billing admin read" ON public.billing_settings
  USING (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "billing admin write" ON public.billing_settings
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "blocked_ips_admin_all" ON public.blocked_ips
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "broadcasts_admin_write" ON public.broadcasts
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "chats_admin_read" ON public.chats
  USING (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "flags admin write" ON public.feature_flags
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "files_admin_read" ON public.files
  USING (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "login_admin_read" ON public.login_history
  USING (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "messages_admin_read" ON public.messages
  USING (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "models admin write" ON public.model_assignments
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "notif_admin_all" ON public.notifications
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "providers admin read" ON public.payment_providers
  USING (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "providers admin write" ON public.payment_providers
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "plans admin write" ON public.plans
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "profiles_admin_read" ON public.profiles
  USING (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "profiles_admin_update" ON public.profiles
  USING (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "redeem self" ON public.promotion_redemptions
  USING ((auth.uid() = user_id) OR private.has_role(auth.uid(), 'admin'));
ALTER POLICY "promos admin read" ON public.promotions
  USING (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "promos admin write" ON public.promotions
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "override admin write" ON public.user_overrides
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "override self read" ON public.user_overrides
  USING ((auth.uid() = user_id) OR private.has_role(auth.uid(), 'admin'));
ALTER POLICY "user_roles_admin_read" ON public.user_roles
  USING (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "sessions_admin_read" ON public.user_sessions
  USING (private.has_role(auth.uid(), 'admin'));

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;