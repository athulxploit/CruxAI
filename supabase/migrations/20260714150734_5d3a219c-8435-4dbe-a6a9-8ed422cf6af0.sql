
CREATE TABLE IF NOT EXISTS public.daily_message_quotas (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

GRANT SELECT ON public.daily_message_quotas TO authenticated;
GRANT ALL ON public.daily_message_quotas TO service_role;

ALTER TABLE public.daily_message_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own quota"
  ON public.daily_message_quotas FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Server-authoritative quota consumer. Called from /api/ai-stream.
-- Returns json { allowed, remaining, limit, reason }.
CREATE OR REPLACE FUNCTION public.consume_message_quota(_effort text DEFAULT 'medium')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean;
  ov RECORD;
  daily_limit integer;
  today date := (now() AT TIME ZONE 'UTC')::date;
  new_count integer;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'unauthenticated');
  END IF;

  SELECT public.has_role(uid, 'admin') INTO is_admin;
  IF is_admin THEN
    RETURN jsonb_build_object('allowed', true, 'remaining', -1, 'limit', -1, 'reason', 'admin');
  END IF;

  SELECT plan_override, msg_limit, unlimited, lifetime_premium, trial_until
    INTO ov
    FROM public.user_overrides WHERE user_id = uid;

  IF ov IS NOT NULL AND (ov.unlimited = true OR ov.lifetime_premium = true OR (ov.trial_until IS NOT NULL AND ov.trial_until > now())) THEN
    RETURN jsonb_build_object('allowed', true, 'remaining', -1, 'limit', -1, 'reason', 'premium');
  END IF;

  daily_limit := COALESCE(ov.msg_limit, 50);

  INSERT INTO public.daily_message_quotas (user_id, day, count)
  VALUES (uid, today, 1)
  ON CONFLICT (user_id, day)
  DO UPDATE SET count = public.daily_message_quotas.count + 1,
                updated_at = now()
  RETURNING count INTO new_count;

  IF new_count > daily_limit THEN
    UPDATE public.daily_message_quotas
      SET count = daily_limit
      WHERE user_id = uid AND day = today;
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'limit', daily_limit, 'reason', 'limit_exceeded');
  END IF;

  RETURN jsonb_build_object('allowed', true, 'remaining', daily_limit - new_count, 'limit', daily_limit, 'reason', 'ok');
END;
$$;

REVOKE ALL ON FUNCTION public.consume_message_quota(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_message_quota(text) TO authenticated, service_role;
