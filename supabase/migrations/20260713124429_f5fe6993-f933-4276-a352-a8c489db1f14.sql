ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general';
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS session_token text;
CREATE INDEX IF NOT EXISTS user_sessions_session_token_idx ON public.user_sessions(session_token);