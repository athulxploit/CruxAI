
CREATE TABLE public.security_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  two_factor_enabled boolean NOT NULL DEFAULT false,
  two_factor_secret text,
  login_alerts boolean NOT NULL DEFAULT true,
  recovery_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  passkeys jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_prefs TO authenticated;
GRANT ALL ON public.security_prefs TO service_role;
ALTER TABLE public.security_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "security_prefs_self" ON public.security_prefs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER security_prefs_updated BEFORE UPDATE ON public.security_prefs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  token_prefix text NOT NULL,
  token_hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY['read']::text[],
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_tokens TO authenticated;
GRANT ALL ON public.api_tokens TO service_role;
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_tokens_self" ON public.api_tokens FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.connected_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  name text NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY[]::text[],
  account_label text,
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connected_apps TO authenticated;
GRANT ALL ON public.connected_apps TO service_role;
ALTER TABLE public.connected_apps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "connected_apps_self" ON public.connected_apps FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
