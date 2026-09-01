CREATE TABLE public.user_chats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  chats JSONB NOT NULL DEFAULT '[]'::jsonb,
  active_chat_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_chats TO authenticated;
GRANT ALL ON public.user_chats TO service_role;
ALTER TABLE public.user_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own row select" ON public.user_chats FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own row insert" ON public.user_chats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own row update" ON public.user_chats FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own row delete" ON public.user_chats FOR DELETE TO authenticated USING (auth.uid() = user_id);