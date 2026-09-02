-- Create app_role enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
    END IF;
END
$$;

-- Workflow Status Enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflow_status') THEN
        CREATE TYPE public.workflow_status AS ENUM ('draft', 'active', 'inactive');
    END IF;
END
$$;

-- Execution Status Enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'execution_status') THEN
        CREATE TYPE public.execution_status AS ENUM ('queued', 'running', 'waiting', 'success', 'failed', 'stopped');
    END IF;
END
$$;

-- Workflows Table
CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    nodes JSONB NOT NULL DEFAULT '[]',
    edges JSONB NOT NULL DEFAULT '[]',
    status public.workflow_status NOT NULL DEFAULT 'draft',
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflows TO authenticated;
GRANT ALL ON public.workflows TO service_role;

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own workflows"
ON public.workflows
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Workflow Executions Table
CREATE TABLE IF NOT EXISTS public.workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status public.execution_status NOT NULL DEFAULT 'queued',
    input JSONB DEFAULT '{}',
    output JSONB DEFAULT '{}',
    logs JSONB DEFAULT '[]',
    start_time TIMESTAMPTZ DEFAULT now(),
    end_time TIMESTAMPTZ,
    execution_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_executions TO authenticated;
GRANT ALL ON public.workflow_executions TO service_role;

ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own workflow executions"
ON public.workflow_executions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own executions"
ON public.workflow_executions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own executions"
ON public.workflow_executions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Credentials Table
CREATE TABLE IF NOT EXISTS public.workflow_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    encrypted_data TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_credentials TO authenticated;
GRANT ALL ON public.workflow_credentials TO service_role;

ALTER TABLE public.workflow_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own credentials"
ON public.workflow_credentials
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);