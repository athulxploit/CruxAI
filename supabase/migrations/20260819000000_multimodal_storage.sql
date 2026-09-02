-- Ensure user-files bucket is private and has RLS
-- (Assuming the bucket already exists based on chat-input.tsx usage)

-- Create a policy to allow users to see only their own files
CREATE POLICY "Users can only view their own files" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (bucket_id = 'user-files' AND auth.uid() = owner);

-- Update profiles to allow data collection (already exists in some forms, but ensuring schema alignment)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allow_data_collection BOOLEAN DEFAULT TRUE;

-- Update activity_log or xcomm_interactions to track multimodal metadata if needed
-- (Adding metadata columns to xcomm_model_usage if they don't exist)
ALTER TABLE public.xcomm_model_usage ADD COLUMN IF NOT EXISTS has_image BOOLEAN DEFAULT FALSE;
ALTER TABLE public.xcomm_model_usage ADD COLUMN IF NOT EXISTS image_count INTEGER DEFAULT 0;

GRANT ALL ON public.xcomm_model_usage TO authenticated;
GRANT ALL ON public.xcomm_model_usage TO service_role;
