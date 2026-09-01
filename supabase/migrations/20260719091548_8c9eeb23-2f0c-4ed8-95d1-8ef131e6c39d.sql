
CREATE TABLE public.honeytokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  token text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  hits integer NOT NULL DEFAULT 0,
  last_hit_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.honeytokens TO authenticated;
GRANT ALL ON public.honeytokens TO service_role;
ALTER TABLE public.honeytokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage honeytokens" ON public.honeytokens
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.honeytokens (label, token) VALUES
  ('decoy-admin-api-key', 'arch_live_sk_' || encode(gen_random_bytes(18), 'hex')),
  ('decoy-service-role', 'sb_secret_' || encode(gen_random_bytes(20), 'hex'))
ON CONFLICT DO NOTHING;
