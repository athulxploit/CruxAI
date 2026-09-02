CREATE TABLE public.xcomm_interactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    system_prompt text,
    user_query text,
    ai_response text,
    user_rating text,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.xcomm_interactions TO authenticated;
GRANT ALL ON public.xcomm_interactions TO service_role;
GRANT INSERT ON public.xcomm_interactions TO anon;

ALTER TABLE public.xcomm_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own interactions"
    ON public.xcomm_interactions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interactions"
    ON public.xcomm_interactions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anon can insert interactions"
    ON public.xcomm_interactions
    FOR INSERT
    TO anon
    WITH CHECK (user_id IS NULL);