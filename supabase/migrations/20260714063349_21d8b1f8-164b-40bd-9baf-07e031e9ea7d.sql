
-- 1. Lock down profiles self-update to safe columns (prevent self plan/status/usage escalation)
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow admins to change anything
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  -- Non-admins: block changes to privileged columns
  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.messages_used IS DISTINCT FROM OLD.messages_used
     OR NEW.storage_used_bytes IS DISTINCT FROM OLD.storage_used_bytes THEN
    RAISE EXCEPTION 'Not permitted to modify privileged profile fields';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 2. Restrict promotions SELECT to admin only; expose safe RPCs for redemption
DROP POLICY IF EXISTS "promos read auth" ON public.promotions;
CREATE POLICY "promos admin read" ON public.promotions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.check_promo(_code text)
RETURNS TABLE (id uuid, code text, kind text, discount numeric, valid boolean, reason text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.promotions%ROWTYPE;
  used integer;
BEGIN
  SELECT * INTO p FROM public.promotions
    WHERE upper(promotions.code) = upper(_code) AND active = true
    LIMIT 1;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, _code, NULL::text, NULL::numeric, false, 'invalid';
    RETURN;
  END IF;
  IF p.expires_at IS NOT NULL AND p.expires_at < now() THEN
    RETURN QUERY SELECT p.id, p.code, p.kind, p.discount, false, 'expired';
    RETURN;
  END IF;
  IF p.usage_limit IS NOT NULL AND auth.uid() IS NOT NULL THEN
    SELECT count(*)::int INTO used FROM public.promotion_redemptions
      WHERE user_id = auth.uid() AND promo_id = p.id;
    IF used >= p.usage_limit THEN
      RETURN QUERY SELECT p.id, p.code, p.kind, p.discount, false, 'limit_reached';
      RETURN;
    END IF;
  END IF;
  RETURN QUERY SELECT p.id, p.code, p.kind, p.discount, true, NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION public.check_promo(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_promo(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.increment_promo_use(_promo_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.promotions SET used_count = COALESCE(used_count, 0) + 1 WHERE id = _promo_id;
END;
$$;
REVOKE ALL ON FUNCTION public.increment_promo_use(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_promo_use(uuid) TO authenticated;

-- 3. Restrict billing_settings SELECT to admin only
DROP POLICY IF EXISTS "billing read auth" ON public.billing_settings;
CREATE POLICY "billing admin read" ON public.billing_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
