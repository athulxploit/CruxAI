ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';
CREATE INDEX IF NOT EXISTS activity_log_type_status_idx ON public.activity_log(type, status);
GRANT UPDATE ON public.activity_log TO authenticated;
CREATE POLICY "activity_admin_update" ON public.activity_log FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));