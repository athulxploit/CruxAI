
-- 1. Private schema for internal helpers (not exposed by PostgREST)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

-- 2. Lock down SECURITY DEFINER functions — revoke from PUBLIC/anon/authenticated
REVOKE ALL ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_promo_use(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_expired_chats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_chat_expiry() FROM PUBLIC, anon, authenticated;

-- App-callable helpers: keep explicit grants only for signed-in users
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.consume_message_quota(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_message_quota(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.check_promo(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_promo(text) TO authenticated, service_role;

-- 3. Mirror has_role into private schema for internal trigger use
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, app_role) TO service_role;

-- 4. Narrow the "broadcast notifications" policy: require explicit is_global flag
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='notifications' AND column_name='is_global'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN is_global boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Replace any permissive "user_id IS NULL" policy with a stricter version
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT polname FROM pg_policy WHERE polrelid = 'public.notifications'::regclass LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', p.polname);
  END LOOP;
END $$;

CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Everyone reads global notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (is_global = true AND user_id IS NULL);

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role manages notifications"
  ON public.notifications FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 5. Data minimisation: redact PII from old activity_log entries
CREATE OR REPLACE FUNCTION public.redact_old_activity_log()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  UPDATE public.activity_log
     SET ip_address = NULL,
         user_agent = NULL
   WHERE created_at < now() - interval '30 days'
     AND (ip_address IS NOT NULL OR user_agent IS NOT NULL);
  GET DIAGNOSTICS n = ROW_COUNT;
  DELETE FROM public.activity_log WHERE created_at < now() - interval '180 days';
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.redact_old_activity_log() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redact_old_activity_log() TO service_role;

-- 6. Schedule daily redaction (safe if pg_cron already scheduled it)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.unschedule('arch-redact-activity-log') 
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='arch-redact-activity-log');
    PERFORM cron.schedule('arch-redact-activity-log','30 3 * * *',
      $c$SELECT public.redact_old_activity_log();$c$);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
