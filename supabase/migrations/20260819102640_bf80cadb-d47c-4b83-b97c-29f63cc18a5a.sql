CREATE TABLE public.xcomm_test_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id TEXT NOT NULL,
    prompt TEXT NOT NULL,
    response TEXT,
    latency_ms INTEGER,
    status TEXT NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT ON public.xcomm_test_logs TO authenticated;
GRANT ALL ON public.xcomm_test_logs TO service_role;

ALTER TABLE public.xcomm_test_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can see all test logs" 
ON public.xcomm_test_logs FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert test logs" 
ON public.xcomm_test_logs FOR INSERT 
TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'admin'));