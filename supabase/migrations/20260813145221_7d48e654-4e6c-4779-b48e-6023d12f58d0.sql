-- Metrixcom Computer System Migration

-- 1. Device tracking
CREATE TABLE public.user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('local', 'cloud')),
    os TEXT,
    os_version TEXT,
    app_version TEXT,
    last_seen_at TIMESTAMPTZ DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'connecting', 'error', 'pending_permission')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Granular Permissions
CREATE TABLE public.computer_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.user_devices(id) ON DELETE CASCADE,
    capability TEXT NOT NULL, -- e.g. 'file_read', 'file_write', 'terminal_run'
    scope TEXT DEFAULT '*', -- e.g. path/to/project
    granted BOOLEAN DEFAULT false,
    risk_level TEXT CHECK (risk_level IN ('safe', 'sensitive', 'high_risk')),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, device_id, capability, scope)
);

-- 3. Audit Logs
CREATE TABLE public.computer_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.user_devices(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    reason TEXT,
    status TEXT NOT NULL,
    risk_level TEXT,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Access Control
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_devices TO authenticated;
GRANT ALL ON public.user_devices TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.computer_permissions TO authenticated;
GRANT ALL ON public.computer_permissions TO service_role;

GRANT SELECT, INSERT ON public.computer_audit_logs TO authenticated;
GRANT ALL ON public.computer_audit_logs TO service_role;

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.computer_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.computer_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own devices" ON public.user_devices
    FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own permissions" ON public.computer_permissions
    FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view own audit logs" ON public.computer_audit_logs
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audit logs" ON public.computer_audit_logs
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
