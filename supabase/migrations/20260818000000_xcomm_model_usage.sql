-- XCOMM Model Entitlements and Usage Tables
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'model_usage_status') THEN
        CREATE TYPE public.model_usage_status AS ENUM ('success', 'error', 'timeout');
    END IF;
END $$;

-- Centralized Model Registry table for backend enforcement and admin visibility
CREATE TABLE IF NOT EXISTS public.model_registry (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    provider TEXT NOT NULL,
    openrouter_id TEXT NOT NULL,
    min_plan public.app_plan NOT NULL DEFAULT 'free',
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    credit_cost_per_token NUMERIC NOT NULL DEFAULT 1.0,
    daily_limit INTEGER, -- Optional model-specific daily limit override
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Usage Accounting Table
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

-- Model-specific limits configuration
CREATE TABLE IF NOT EXISTS public.model_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan public.app_plan NOT NULL,
    model_key TEXT NOT NULL REFERENCES public.model_registry(key) ON DELETE CASCADE,
    daily_token_limit BIGINT NOT NULL,
    daily_message_limit INTEGER NOT NULL,
    UNIQUE(plan, model_key)
);

-- Grants
GRANT SELECT ON public.model_registry TO authenticated;
GRANT SELECT ON public.model_registry TO anon;
GRANT ALL ON public.model_registry TO service_role;

GRANT INSERT, SELECT ON public.xcomm_model_usage TO authenticated;
GRANT ALL ON public.xcomm_model_usage TO service_role;

GRANT SELECT ON public.model_limits TO authenticated;
GRANT ALL ON public.model_limits TO service_role;

-- RLS
ALTER TABLE public.model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xcomm_model_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on model_registry" ON public.model_registry FOR SELECT USING (true);
CREATE POLICY "Users can view their own usage" ON public.xcomm_model_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Allow authenticated read on model_limits" ON public.model_limits FOR SELECT TO authenticated USING (true);

-- Initial Model Data
INSERT INTO public.model_registry (id, key, display_name, provider, openrouter_id, min_plan, credit_cost_per_token)
VALUES 
('nemotron_3_nano', 'nemotron_3_nano', 'Nemotron-3 Nano', 'NVIDIA', 'nvidia/nemotron-3-nano-30b-a3b', 'free', 1.0),
('glm_52', 'glm_52', 'GLM-5.2', 'Z.ai', 'z-ai/glm-5.2:free', 'free', 1.0),
('gpt_54_nano', 'gpt_54_nano', 'GPT-5.4 Nano', 'OpenAI', 'openai/gpt-5.4-nano', 'standard', 1.5),
('gpt_54_mini', 'gpt_54_mini', 'GPT-5.4 Mini', 'OpenAI', 'openai/gpt-5.4-mini', 'standard', 2.0),
('deepseek_v4_flash', 'deepseek_v4_flash', 'DeepSeek V4 Flash', 'DeepSeek', 'deepseek/deepseek-chat', 'standard', 1.2),
('nemotron_3_super', 'nemotron_3_super', 'Nemotron-3 Super', 'NVIDIA', 'nvidia/nemotron-3-super-120b-a12b:free', 'pro', 3.0),
('gpt_53_codex', 'gpt_53_codex', 'GPT-5.3 Codex', 'OpenAI', 'openai/gpt-5.3-codex', 'pro', 4.0),
('gpt_55_terra', 'gpt_55_terra', 'GPT-5.5 Terra', 'OpenAI', 'openai/gpt-5.5', 'pro', 5.0),
('claude_sonnet_5', 'claude_sonnet_5', 'Claude Sonnet 5', 'Anthropic', 'anthropic/claude-sonnet-5', 'pro', 6.0),
('nemotron_3_ultra', 'nemotron_3_ultra', 'Nemotron-3 Ultra', 'NVIDIA', 'nvidia/nemotron-3-ultra-550b-a55b:free', 'proplus', 10.0),
('gpt_56_sol', 'gpt_56_sol', 'GPT-5.6 Sol', 'OpenAI', 'openai/gpt-5.6-sol', 'proplus', 12.0),
('claude_opus_46', 'claude_opus_46', 'Claude Opus 4.6', 'Anthropic', 'anthropic/claude-opus-4.6', 'proplus', 15.0)
ON CONFLICT (id) DO UPDATE SET 
    display_name = EXCLUDED.display_name,
    openrouter_id = EXCLUDED.openrouter_id,
    min_plan = EXCLUDED.min_plan;

-- Initial Limits
INSERT INTO public.model_limits (plan, model_key, daily_token_limit, daily_message_limit)
VALUES 
('free', 'nemotron_3_nano', 50000, 20),
('standard', 'nemotron_3_nano', 200000, 100),
('free', 'glm_52', 50000, 20),
('standard', 'gpt_54_nano', 100000, 50),
('standard', 'deepseek_v4_flash', 100000, 50),
('pro', 'claude_sonnet_5', 500000, 200),
('proplus', 'claude_opus_46', 1000000, 500)
ON CONFLICT DO NOTHING;
