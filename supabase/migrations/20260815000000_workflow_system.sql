-- Create app_role if not exists (already exists from user-roles instructions usually, but safe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
    END IF;
END$$;

-- Workflows table
CREATE TABLE public.workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    nodes JSONB NOT NULL DEFAULT '[]',
    edges JSONB NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Workflow executions table
CREATE TABLE public.workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'running', -- running, success, failed
    start_time TIMESTAMPTZ DEFAULT now(),
    end_time TIMESTAMPTZ,
    trigger_data JSONB DEFAULT '{}',
    execution_log JSONB DEFAULT '[]',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflows TO authenticated;
GRANT ALL ON public.workflows TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.workflow_executions TO authenticated;
GRANT ALL ON public.workflow_executions TO service_role;

-- RLS
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

-- Policies for workflows
CREATE POLICY "Users can manage their own workflows"
ON public.workflows
FOR ALL
TO authenticated
USING (auth.uid() = user_id);

-- Policies for workflow executions
CREATE POLICY "Users can view their own workflow executions"
ON public.workflow_executions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own executions"
ON public.workflow_executions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.workflows
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

