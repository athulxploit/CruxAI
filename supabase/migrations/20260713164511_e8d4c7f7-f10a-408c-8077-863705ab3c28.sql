-- Lock down SECURITY DEFINER trigger functions: only the trigger system needs to run them.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- has_role must remain callable by signed-in users because RLS policies invoke it,
-- but anonymous users should not be able to probe roles.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Remove sensitive tables from the Realtime publication so row changes are never
-- broadcast over the websocket, even if an RLS policy is later misconfigured.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.payment_providers; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.billing_settings;  EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.admin_logs;        EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.blocked_ips;       EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.login_history;     EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.user_sessions;     EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END $$;