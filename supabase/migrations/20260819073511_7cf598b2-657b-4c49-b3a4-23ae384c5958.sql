CREATE OR REPLACE FUNCTION public.get_plan_distribution()
RETURNS TABLE (plan text, count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT plan::text, count(*) 
  FROM public.profiles 
  GROUP BY plan;
$$;

CREATE OR REPLACE FUNCTION public.get_model_usage_stats(_days int DEFAULT 1)
RETURNS TABLE (status text, count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status::text, count(*) 
  FROM public.xcomm_model_usage 
  WHERE created_at > (now() - (_days || ' days')::interval)
  GROUP BY status;
$$;

CREATE OR REPLACE FUNCTION public.get_model_leaderboard(_days int DEFAULT 1)
RETURNS TABLE (model_key text, count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT model_key, count(*) 
  FROM public.xcomm_model_usage 
  WHERE created_at > (now() - (_days || ' days')::interval)
    AND status = 'success'
  GROUP BY model_key
  ORDER BY count DESC
  LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION public.get_user_growth(_days int DEFAULT 30)
RETURNS TABLE (date date, count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT created_at::date as date, count(*)
  FROM public.profiles
  WHERE created_at > (now() - (_days || ' days')::interval)
  GROUP BY date
  ORDER BY date ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_plan_distribution() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_model_usage_stats(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_model_leaderboard(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_growth(int) TO authenticated;
