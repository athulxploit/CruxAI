CREATE OR REPLACE FUNCTION public.increment_promo_use(_promo_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.promotions
  SET used_count = COALESCE(used_count, 0) + 1,
      updated_at = now()
  WHERE id = _promo_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.increment_promo_use(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_promo_use(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.increment_promo_use(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_promo_use(uuid) TO service_role;