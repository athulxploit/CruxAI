
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_until timestamptz,
  ADD COLUMN IF NOT EXISTS banned_at timestamptz,
  ADD COLUMN IF NOT EXISTS custom_limits jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS global_limits jsonb NOT NULL DEFAULT jsonb_build_object(
    'max_upload_size_mb', 25,'max_chat_length', 200,'max_chats', 500,
    'max_attachments', 10,'max_storage_mb', 2048,'max_file_size_mb', 25,'daily_requests', 1000),
  ADD COLUMN IF NOT EXISTS default_agent text DEFAULT 'pulse-1';

CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, description text DEFAULT '',
  price_monthly numeric NOT NULL DEFAULT 0, price_yearly numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active', display_order int NOT NULL DEFAULT 0,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb, features jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plans readable by all" ON public.plans;
DROP POLICY IF EXISTS "plans admin write" ON public.plans;
CREATE POLICY "plans readable by all" ON public.plans FOR SELECT USING (true);
CREATE POLICY "plans admin write" ON public.plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS trg_plans_updated ON public.plans;
CREATE TRIGGER trg_plans_updated BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.user_overrides (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_override text, msg_limit int, storage_mb int,
  lifetime_premium boolean NOT NULL DEFAULT false, trial_until timestamptz,
  unlimited boolean NOT NULL DEFAULT false, notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_overrides TO authenticated;
GRANT ALL ON public.user_overrides TO service_role;
ALTER TABLE public.user_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "override self read" ON public.user_overrides;
DROP POLICY IF EXISTS "override admin write" ON public.user_overrides;
CREATE POLICY "override self read" ON public.user_overrides FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "override admin write" ON public.user_overrides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS trg_overrides_updated ON public.user_overrides;
CREATE TRIGGER trg_overrides_updated BEFORE UPDATE ON public.user_overrides FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL, kind text NOT NULL DEFAULT 'coupon',
  discount numeric NOT NULL DEFAULT 0,
  plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  duration_days int, expires_at timestamptz, usage_limit int,
  used_count int NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "promos read auth" ON public.promotions;
DROP POLICY IF EXISTS "promos admin write" ON public.promotions;
CREATE POLICY "promos read auth" ON public.promotions FOR SELECT TO authenticated USING (true);
CREATE POLICY "promos admin write" ON public.promotions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS trg_promos_updated ON public.promotions;
CREATE TRIGGER trg_promos_updated BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.promotion_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id uuid NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(), UNIQUE (promo_id, user_id));
GRANT SELECT, INSERT ON public.promotion_redemptions TO authenticated;
GRANT ALL ON public.promotion_redemptions TO service_role;
ALTER TABLE public.promotion_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "redeem self" ON public.promotion_redemptions;
DROP POLICY IF EXISTS "redeem insert self" ON public.promotion_redemptions;
CREATE POLICY "redeem self" ON public.promotion_redemptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "redeem insert self" ON public.promotion_redemptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.payment_providers (
  id text PRIMARY KEY, label text NOT NULL,
  enabled boolean NOT NULL DEFAULT false, test_mode boolean NOT NULL DEFAULT true,
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb, webhook_url text,
  updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_providers TO authenticated;
GRANT ALL ON public.payment_providers TO service_role;
ALTER TABLE public.payment_providers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "providers admin read" ON public.payment_providers;
DROP POLICY IF EXISTS "providers admin write" ON public.payment_providers;
CREATE POLICY "providers admin read" ON public.payment_providers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "providers admin write" ON public.payment_providers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS trg_providers_updated ON public.payment_providers;
CREATE TRIGGER trg_providers_updated BEFORE UPDATE ON public.payment_providers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.billing_settings (
  id int PRIMARY KEY DEFAULT 1,
  billing_enabled boolean NOT NULL DEFAULT false, trial_enabled boolean NOT NULL DEFAULT false,
  trial_days int NOT NULL DEFAULT 7, auto_renewal boolean NOT NULL DEFAULT true,
  tax_percent numeric NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT one_row CHECK (id = 1));
GRANT SELECT, INSERT, UPDATE ON public.billing_settings TO authenticated;
GRANT ALL ON public.billing_settings TO service_role;
ALTER TABLE public.billing_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "billing read auth" ON public.billing_settings;
DROP POLICY IF EXISTS "billing admin write" ON public.billing_settings;
CREATE POLICY "billing read auth" ON public.billing_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "billing admin write" ON public.billing_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS trg_billing_updated ON public.billing_settings;
CREATE TRIGGER trg_billing_updated BEFORE UPDATE ON public.billing_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY, enabled boolean NOT NULL DEFAULT true,
  description text DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.feature_flags TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "flags read all" ON public.feature_flags;
DROP POLICY IF EXISTS "flags admin write" ON public.feature_flags;
CREATE POLICY "flags read all" ON public.feature_flags FOR SELECT USING (true);
CREATE POLICY "flags admin write" ON public.feature_flags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS trg_flags_updated ON public.feature_flags;
CREATE TRIGGER trg_flags_updated BEFORE UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.model_assignments (
  agent_id text PRIMARY KEY, model text NOT NULL,
  provider text NOT NULL DEFAULT 'lovable', updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.model_assignments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.model_assignments TO authenticated;
GRANT ALL ON public.model_assignments TO service_role;
ALTER TABLE public.model_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "models read all" ON public.model_assignments;
DROP POLICY IF EXISTS "models admin write" ON public.model_assignments;
CREATE POLICY "models read all" ON public.model_assignments FOR SELECT USING (true);
CREATE POLICY "models admin write" ON public.model_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS trg_models_updated ON public.model_assignments;
CREATE TRIGGER trg_models_updated BEFORE UPDATE ON public.model_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'banner', title text NOT NULL, body text DEFAULT '',
  active boolean NOT NULL DEFAULT true, starts_at timestamptz, ends_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.announcements TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "announce read all" ON public.announcements;
DROP POLICY IF EXISTS "announce admin write" ON public.announcements;
CREATE POLICY "announce read all" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "announce admin write" ON public.announcements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS trg_announce_updated ON public.announcements;
CREATE TRIGGER trg_announce_updated BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text, action text NOT NULL, target text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT ON public.admin_logs TO authenticated;
GRANT ALL ON public.admin_logs TO service_role;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "adminlog read admin" ON public.admin_logs;
DROP POLICY IF EXISTS "adminlog insert admin" ON public.admin_logs;
CREATE POLICY "adminlog read admin" ON public.admin_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "adminlog insert admin" ON public.admin_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['plans','feature_flags','announcements','agents_config','model_assignments','profiles','promotions','payment_providers','billing_settings','admin_logs']
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

INSERT INTO public.plans (name, description, price_monthly, price_yearly, status, display_order, limits, features) VALUES
  ('Free','Get started with ARCH AI',0,0,'active',1,
   jsonb_build_object('messages_day',30,'messages_month',300,'pulse',300,'forge',50,'cipher',20,'upload_limit',5,'max_upload_mb',10,'storage_mb',256,'context_length',8000,'web_search',10,'deep_research',2),
   jsonb_build_object('memory',true,'web_search',true,'deep_research',false,'voice',false,'vision',false,'priority_queue',false,'early_access',false)),
  ('Standard','For regular users',9,90,'active',2,
   jsonb_build_object('messages_day',300,'messages_month',5000,'pulse',5000,'forge',1000,'cipher',500,'upload_limit',25,'max_upload_mb',25,'storage_mb',2048,'context_length',32000,'web_search',200,'deep_research',20),
   jsonb_build_object('memory',true,'web_search',true,'deep_research',true,'voice',false,'vision',true,'priority_queue',false,'early_access',false)),
  ('Pro','For power users',19,190,'active',3,
   jsonb_build_object('messages_day',1500,'messages_month',30000,'pulse',30000,'forge',10000,'cipher',5000,'upload_limit',100,'max_upload_mb',100,'storage_mb',20480,'context_length',128000,'web_search',2000,'deep_research',200),
   jsonb_build_object('memory',true,'web_search',true,'deep_research',true,'voice',true,'vision',true,'priority_queue',true,'early_access',true)),
  ('Pro+','Unlimited for teams',49,490,'active',4,
   jsonb_build_object('messages_day',-1,'messages_month',-1,'pulse',-1,'forge',-1,'cipher',-1,'upload_limit',-1,'max_upload_mb',500,'storage_mb',-1,'context_length',200000,'web_search',-1,'deep_research',-1),
   jsonb_build_object('memory',true,'web_search',true,'deep_research',true,'voice',true,'vision',true,'priority_queue',true,'early_access',true))
ON CONFLICT DO NOTHING;

INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('memory',true,'Long-term memory across chats'),
  ('web_search',true,'Composer web search'),
  ('deep_research',true,'Composer deep research'),
  ('operator_mode',true,'Cipher operator mode'),
  ('voice',false,'Voice input/output'),
  ('vision',false,'Image understanding')
ON CONFLICT DO NOTHING;

INSERT INTO public.model_assignments (agent_id, model, provider) VALUES
  ('pulse-1','google/gemini-2.5-flash','lovable'),
  ('forge-1','google/gemini-2.5-pro','lovable'),
  ('cipher-1','openai/gpt-5','lovable')
ON CONFLICT DO NOTHING;

INSERT INTO public.payment_providers (id, label, enabled, test_mode) VALUES
  ('razorpay','Razorpay',false,true),
  ('stripe','Stripe',false,true),
  ('paypal','PayPal',false,true)
ON CONFLICT DO NOTHING;

INSERT INTO public.billing_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
