REVOKE ALL ON FUNCTION public.check_promo(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_promo(text) FROM anon;
REVOKE ALL ON FUNCTION public.check_promo(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_promo(text) TO service_role;

REVOKE ALL ON FUNCTION public.increment_promo_use(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_promo_use(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.increment_promo_use(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_promo_use(uuid) TO service_role;