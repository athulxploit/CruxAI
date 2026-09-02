-- RPC to get performance and quota analytics for admin dashboard
CREATE OR REPLACE FUNCTION public.get_performance_analytics(_days integer DEFAULT 7)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    WITH model_perf AS (
        SELECT 
            model_key,
            AVG(latency_ms) as avg_latency,
            percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_latency,
            COUNT(*) as total_requests,
            COUNT(*) FILTER (WHERE status = 'success') as success_requests,
            COUNT(*) FILTER (WHERE status = 'error') as error_requests
        FROM public.xcomm_model_usage
        WHERE created_at > NOW() - (_days || ' days')::interval
        GROUP BY model_key
    ),
    plan_usage AS (
        SELECT 
            p.plan,
            m.model_key,
            COUNT(m.id) as total_messages,
            SUM(m.total_tokens) as total_tokens,
            AVG(m.latency_ms) as avg_latency
        FROM public.xcomm_model_usage m
        JOIN public.profiles p ON m.user_id = p.id
        WHERE m.created_at > NOW() - (_days || ' days')::interval
        GROUP BY p.plan, m.model_key
    )
    SELECT json_build_object(
        'performance', (SELECT json_agg(model_perf) FROM model_perf),
        'plan_usage', (SELECT json_agg(plan_usage) FROM plan_usage)
    ) INTO result;
    
    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_performance_analytics(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_performance_analytics(integer) TO service_role;
