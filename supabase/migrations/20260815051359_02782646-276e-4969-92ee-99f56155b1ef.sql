
-- Update blueprints table with protocol_id, project_type, and completeness
ALTER TABLE public.blueprints ADD COLUMN IF NOT EXISTS protocol_id TEXT;
ALTER TABLE public.blueprints ADD COLUMN IF NOT EXISTS project_type TEXT;
ALTER TABLE public.blueprints ADD COLUMN IF NOT EXISTS completeness INTEGER DEFAULT 0;

-- Create a unique index on protocol_id
CREATE UNIQUE INDEX IF NOT EXISTS blueprints_protocol_id_key ON public.blueprints (protocol_id);

-- Update existing blueprints to have a protocol_id if they don't
UPDATE public.blueprints 
SET protocol_id = 'XCOM-PRJ-' || upper(substring(id::text from 1 for 8))
WHERE protocol_id IS NULL;

-- Re-grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blueprints TO authenticated;
GRANT ALL ON public.blueprints TO service_role;
