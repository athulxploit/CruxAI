-- Drop existing to re-create with enhanced security and requirements
DROP FUNCTION IF EXISTS public.get_plan_distribution();
DROP FUNCTION IF EXISTS public.get_model_usage_stats(int);
DROP FUNCTION IF EXISTS public.get_model_leaderboard(int);
DROP FUNCTION IF EXISTS public.get_user_growth(int);

-- 1. Plan distribution (Current state, one category per user)
CREATE OR REPLACE FUNCTION public.get_plan_distribution()
RETURNS TABLE (plan text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Internal admin check
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT p.plan::text, count(*) 
  FROM public.profiles p
  GROUP BY p.plan;
END;
$$;

-- 2. Model usage stats (Authoritative aggregates)
CREATE OR REPLACE FUNCTION public.get_model_usage_stats(_days int DEFAULT 1)
RETURNS TABLE (status text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT m.status::text, count(*) 
  FROM public.xcomm_model_usage m
  WHERE m.created_at > (now() - (_days || ' days')::interval)
  GROUP BY m.status;
END;
$$;

-- 3. Model leaderboard (Unique model keys)
CREATE OR REPLACE FUNCTION public.get_model_leaderboard(_days int DEFAULT 1)
RETURNS TABLE (model_key text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT m.model_key, count(*) 
  FROM public.xcomm_model_usage m
  WHERE m.created_at > (now() - (_days || ' days')::interval)
    AND m.status = 'success'
  GROUP BY m.model_key
  ORDER BY count DESC
  LIMIT 20;
END;
$$;

-- 4. User growth (Time series)
CREATE OR REPLACE FUNCTION public.get_user_growth(_days int DEFAULT 30)
RETURNS TABLE (date date, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT created_at::date as date, count(*)
  FROM public.profiles
  WHERE created_at > (now() - (_days || ' days')::interval)
  GROUP BY date
  ORDER BY date ASC;
END;
$$;

-- Revoke all from public, grant to authenticated (functions check role inside)
REVOKE ALL ON FUNCTION public.get_plan_distribution() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_model_usage_stats(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_model_leaderboard(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_growth(int) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_plan_distribution() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_model_usage_stats(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_model_leaderboard(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_growth(int) TO authenticated;
