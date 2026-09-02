-- Authoritative Daily Quota System for XCOMM AI
-- This migration ensures atomic quota checking and shared model usage tracking.

-- 1. Create enum for usage status if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'model_usage_status') THEN
        CREATE TYPE public.model_usage_status AS ENUM ('success', 'error', 'timeout');
    END IF;
END $$;

-- 2. Create usage accounting table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.xcomm_model_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    conversation_id TEXT,
    model_key TEXT NOT NULL,
    provider_model_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    status public.model_usage_status NOT NULL DEFAULT 'success',
    latency_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Ensure we have a way to track daily usage that resets accurately.
CREATE OR REPLACE FUNCTION public.get_usage_window_start(tz TEXT DEFAULT 'UTC')
RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN date_trunc('day', now() AT TIME ZONE tz) AT TIME ZONE tz;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Atomic quota consumption function.
CREATE OR REPLACE FUNCTION public.check_message_quota(_user_id UUID, _tz TEXT DEFAULT 'UTC')
RETURNS JSONB AS $$
DECLARE
    _plan public.user_plan;
    _daily_limit INTEGER;
    _used_today INTEGER;
    _reset_at TIMESTAMPTZ;
    _window_start TIMESTAMPTZ;
    _override_limit INTEGER;
    _is_unlimited BOOLEAN;
    _global_default INTEGER;
BEGIN
    _window_start := public.get_usage_window_start(_tz);
    _reset_at := _window_start + INTERVAL '1 day';

    -- Get user plan
    SELECT plan INTO _plan FROM public.profiles WHERE id = _user_id;
    
    -- Get overrides if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_overrides') THEN
        SELECT msg_limit, unlimited INTO _override_limit, _is_unlimited 
        FROM public.user_overrides WHERE user_id = _user_id;
    END IF;

    -- Get global default (fallback)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_settings') THEN
        SELECT (global_limits->>'daily_msg_limit')::INTEGER INTO _global_default 
        FROM public.app_settings LIMIT 1;
    END IF;

    -- Determine effective limit
    IF _is_unlimited THEN
        _daily_limit := NULL;
    ELSIF _override_limit IS NOT NULL THEN
        _daily_limit := _override_limit;
    ELSE
        -- Plan based defaults if not overridden
        _daily_limit := CASE 
            WHEN _plan = 'proplus' THEN 500
            WHEN _plan = 'pro' THEN 200
            WHEN _plan = 'standard' THEN 100
            ELSE COALESCE(_global_default, 20)
        END;
    END IF;

    -- Count successful messages in current window
    SELECT COUNT(*)::INTEGER INTO _used_today
    FROM public.xcomm_model_usage
    WHERE user_id = _user_id
      AND status = 'success'
      AND created_at >= _window_start;

    RETURN jsonb_build_object(
        'allowed', (_daily_limit IS NULL OR _used_today < _daily_limit),
        'used', _used_today,
        'limit', _daily_limit,
        'remaining', CASE WHEN _daily_limit IS NULL THEN 999999 ELSE (_daily_limit - _used_today) END,
        'reset_at', _reset_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to commit a successful message.
CREATE OR REPLACE FUNCTION public.commit_message_usage(
    _user_id UUID,
    _model_key TEXT,
    _provider_model_id TEXT,
    _provider TEXT,
    _conversation_id TEXT DEFAULT NULL,
    _tokens INTEGER DEFAULT 0,
    _tz TEXT DEFAULT 'UTC'
) RETURNS JSONB AS $$
BEGIN
    INSERT INTO public.xcomm_model_usage (
        user_id,
        model_key,
        provider_model_id,
        provider,
        conversation_id,
        total_tokens,
        status
    ) VALUES (
        _user_id,
        _model_key,
        _provider_model_id,
        _provider,
        _conversation_id,
        _tokens,
        'success'
    );

    -- Return updated status
    RETURN public.check_message_quota(_user_id, _tz);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Revoke old consume_message_quota to avoid confusion.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'consume_message_quota') THEN
        DROP FUNCTION IF EXISTS public.consume_message_quota(UUID, TEXT);
    END IF;
END $$;

-- Grants
GRANT EXECUTE ON FUNCTION public.check_message_quota(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.commit_message_usage(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_usage_window_start(TEXT) TO authenticated;

GRANT SELECT, INSERT ON public.xcomm_model_usage TO authenticated;
GRANT ALL ON public.xcomm_model_usage TO service_role;

ALTER TABLE public.xcomm_model_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own usage" ON public.xcomm_model_usage;
CREATE POLICY "Users can view their own usage" ON public.xcomm_model_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own usage" ON public.xcomm_model_usage;
CREATE POLICY "Users can insert their own usage" ON public.xcomm_model_usage FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
