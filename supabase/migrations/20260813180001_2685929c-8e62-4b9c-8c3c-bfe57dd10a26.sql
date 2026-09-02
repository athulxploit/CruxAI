
ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS local_compute_status text DEFAULT 'operational',
ADD COLUMN IF NOT EXISTS cloud_compute_status text DEFAULT 'operational';

-- Type check safety for existing rows
UPDATE public.app_settings 
SET local_compute_status = 'operational' 
WHERE local_compute_status IS NULL;

UPDATE public.app_settings 
SET cloud_compute_status = 'operational' 
WHERE cloud_compute_status IS NULL;
