
-- 1. Retention columns on chats
ALTER TABLE public.chats
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Backfill expires_at for existing rows (7 days from updated_at)
UPDATE public.chats SET expires_at = updated_at + interval '7 days'
  WHERE expires_at IS NULL AND pinned = false;

-- Trigger: keep expires_at in sync with updated_at unless pinned
CREATE OR REPLACE FUNCTION public.set_chat_expiry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.pinned = true THEN
    NEW.expires_at := NULL;
  ELSE
    NEW.expires_at := COALESCE(NEW.updated_at, now()) + interval '7 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chats_expiry ON public.chats;
CREATE TRIGGER trg_chats_expiry
  BEFORE INSERT OR UPDATE ON public.chats
  FOR EACH ROW EXECUTE FUNCTION public.set_chat_expiry();

CREATE INDEX IF NOT EXISTS chats_expires_at_idx ON public.chats (expires_at)
  WHERE pinned = false;

-- 2. Encrypted-at-rest columns for the client-encrypted sync blob
ALTER TABLE public.user_chats
  ADD COLUMN IF NOT EXISTS encrypted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ciphertext text;

-- 3. Purge function + hourly cron
CREATE OR REPLACE FUNCTION public.purge_expired_chats()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  DELETE FROM public.chats
   WHERE pinned = false
     AND expires_at IS NOT NULL
     AND expires_at < now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule any prior definition, then schedule fresh hourly sweep
DO $$
BEGIN
  PERFORM cron.unschedule('purge-expired-chats');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'purge-expired-chats',
  '17 * * * *',
  $$SELECT public.purge_expired_chats();$$
);
