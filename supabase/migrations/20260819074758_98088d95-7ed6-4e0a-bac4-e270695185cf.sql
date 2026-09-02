CREATE POLICY "Users can only view their own files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'user-files' AND auth.uid() = owner);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allow_data_collection BOOLEAN DEFAULT TRUE;
ALTER TABLE public.xcomm_model_usage ADD COLUMN IF NOT EXISTS has_image BOOLEAN DEFAULT FALSE;
ALTER TABLE public.xcomm_model_usage ADD COLUMN IF NOT EXISTS image_count INTEGER DEFAULT 0;
GRANT ALL ON public.xcomm_model_usage TO authenticated;
GRANT ALL ON public.xcomm_model_usage TO service_role;