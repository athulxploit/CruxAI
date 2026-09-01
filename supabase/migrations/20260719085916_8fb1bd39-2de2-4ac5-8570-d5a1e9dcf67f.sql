CREATE TABLE public.ip_allowlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cidr cidr NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, cidr)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ip_allowlist TO authenticated;
GRANT ALL ON public.ip_allowlist TO service_role;

ALTER TABLE public.ip_allowlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own IP allowlist"
  ON public.ip_allowlist
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX ip_allowlist_user_id_idx ON public.ip_allowlist(user_id);