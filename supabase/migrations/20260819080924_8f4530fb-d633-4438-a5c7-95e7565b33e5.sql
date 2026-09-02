-- Migration to add admin analytics functions for multimodal usage

-- Function to get model leaderboard with multimodal stats
CREATE OR REPLACE FUNCTION public.get_model_multimodal_stats(_days integer DEFAULT 7)
RETURNS TABLE (
  model_id text,
  total_requests bigint,
  successful_requests bigint,
  failed_requests bigint,
  total_tokens bigint,
  requests_with_images bigint,
  total_images bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    model_key as model_id,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE status = 'success') as successful_requests,
    COUNT(*) FILTER (WHERE status = 'error') as failed_requests,
    SUM(COALESCE(total_tokens, 0)) as total_tokens,
    COUNT(*) FILTER (WHERE has_image = true) as requests_with_images,
    SUM(COALESCE(image_count, 0)) as total_images
  FROM public.xcomm_model_usage
  WHERE created_at > now() - (_days || ' days')::interval
  GROUP BY model_key
  ORDER BY total_requests DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_model_multimodal_stats(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_model_multimodal_stats(integer) TO service_role;
