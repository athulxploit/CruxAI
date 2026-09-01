-- Inactive-user data purge policy.
-- Anonymize after 12 months of inactivity, hard-delete after 13.

CREATE OR REPLACE FUNCTION private.purge_inactive_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public, auth
AS $$
DECLARE
  anon_cutoff timestamptz := now() - interval '12 months';
  del_cutoff  timestamptz := now() - interval '13 months';
  anonymized  integer := 0;
  deleted     integer := 0;
  u record;
BEGIN
  -- 1) Anonymize + wipe user-owned data for accounts inactive >= 12 months
  --    but still within retention window.
  FOR u IN
    SELECT id
      FROM auth.users
     WHERE COALESCE(last_sign_in_at, created_at) < anon_cutoff
       AND COALESCE(last_sign_in_at, created_at) >= del_cutoff
       AND (raw_user_meta_data->>'arch_anonymized') IS DISTINCT FROM 'true'
  LOOP
    -- Wipe user-owned rows (chats already encrypted, but remove anyway).
    DELETE FROM public.user_chats     WHERE user_id = u.id;
    DELETE FROM public.chats          WHERE user_id = u.id;
    DELETE FROM public.messages       WHERE user_id = u.id;
    DELETE FROM public.files          WHERE user_id = u.id;
    DELETE FROM public.memories       WHERE user_id = u.id;
    DELETE FROM public.api_tokens     WHERE user_id = u.id;
    DELETE FROM public.user_sessions  WHERE user_id = u.id;
    DELETE FROM public.trusted_devices WHERE user_id = u.id;
    DELETE FROM public.login_history  WHERE user_id = u.id;
    DELETE FROM public.connected_apps WHERE user_id = u.id;
    DELETE FROM public.notifications  WHERE user_id = u.id;

    -- Scrub identifying fields on profile.
    UPDATE public.profiles
       SET display_name = 'Deleted user',
           email        = NULL,
           avatar_url   = NULL
     WHERE id = u.id;

    -- Mark anonymized so we don't re-run on the same account.
    UPDATE auth.users
       SET raw_user_meta_data =
             COALESCE(raw_user_meta_data, '{}'::jsonb)
             || jsonb_build_object('arch_anonymized', 'true',
                                   'arch_anonymized_at', now()::text)
     WHERE id = u.id;

    anonymized := anonymized + 1;
  END LOOP;

  -- 2) Hard-delete auth users inactive >= 13 months.
  FOR u IN
    SELECT id
      FROM auth.users
     WHERE COALESCE(last_sign_in_at, created_at) < del_cutoff
  LOOP
    DELETE FROM auth.users WHERE id = u.id;
    deleted := deleted + 1;
  END LOOP;

  RETURN jsonb_build_object('anonymized', anonymized, 'deleted', deleted, 'ran_at', now());
END;
$$;

REVOKE ALL ON FUNCTION private.purge_inactive_users() FROM PUBLIC, anon, authenticated;

-- Daily schedule at 03:30 UTC.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'arch-purge-inactive-users') THEN
    PERFORM cron.unschedule('arch-purge-inactive-users');
  END IF;
  PERFORM cron.schedule(
    'arch-purge-inactive-users',
    '30 3 * * *',
    $cron$ SELECT private.purge_inactive_users(); $cron$
  );
END $$;