-- Drop if exists to ensure clean state
DROP TABLE IF EXISTS public.app_user_connections;

CREATE TABLE public.app_user_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    connector_id TEXT NOT NULL,
    provider_account_id TEXT,
    account_display_name TEXT,
    connection_key_ciphertext TEXT NOT NULL,
    scopes TEXT[],
    status TEXT DEFAULT 'connected',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_used_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, connector_id)
);

-- GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user_connections TO authenticated;
GRANT ALL ON public.app_user_connections TO service_role;

-- RLS
ALTER TABLE public.app_user_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own connections"
ON public.app_user_connections
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
