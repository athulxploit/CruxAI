
CREATE OR REPLACE FUNCTION public.sec_definers_missing_search_path()
RETURNS TABLE(function_name text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT (n.nspname || '.' || p.proname)::text
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.prosecdef = true
     AND NOT EXISTS (
       SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) c
        WHERE c LIKE 'search_path=%'
     );
$$;

CREATE OR REPLACE FUNCTION public.sec_anon_selectable_tables()
RETURNS TABLE(tablename text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT c.relname::text
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relkind = 'r'
     AND has_table_privilege('anon', c.oid, 'SELECT');
$$;

CREATE OR REPLACE FUNCTION public.sec_storage_public_buckets()
RETURNS TABLE(bucket_id text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = storage, pg_catalog
AS $$
  SELECT id::text FROM storage.buckets WHERE public = true;
$$;

CREATE OR REPLACE FUNCTION public.sec_tables_partial_policy_coverage()
RETURNS TABLE(tablename text, missing_verbs text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  WITH tabs AS (
    SELECT c.oid, c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND c.relrowsecurity = true
  ),
  cmds AS (
    SELECT t.relname,
           COALESCE(
             array_agg(DISTINCT p.polcmd) FILTER (WHERE p.polcmd IS NOT NULL),
             ARRAY[]::"char"[]
           ) AS present
      FROM tabs t
      LEFT JOIN pg_policy p ON p.polrelid = t.oid
     GROUP BY t.relname
  )
  SELECT relname::text,
         array_to_string(
           ARRAY(
             SELECT verb FROM (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE')) v(verb)
              WHERE NOT (
                ('r'::"char" = ANY(present) AND verb = 'SELECT')
                OR ('a'::"char" = ANY(present) AND verb = 'INSERT')
                OR ('w'::"char" = ANY(present) AND verb = 'UPDATE')
                OR ('d'::"char" = ANY(present) AND verb = 'DELETE')
                OR ('*'::"char" = ANY(present))
              )
           ),
           ','
         )
    FROM cmds
   WHERE array_length(present, 1) IS NOT NULL
     AND NOT ('*'::"char" = ANY(present));
$$;

REVOKE ALL ON FUNCTION public.sec_definers_missing_search_path() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sec_anon_selectable_tables() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sec_storage_public_buckets() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sec_tables_partial_policy_coverage() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sec_definers_missing_search_path() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.sec_anon_selectable_tables() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.sec_storage_public_buckets() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.sec_tables_partial_policy_coverage() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sec_definers_missing_search_path() TO service_role;
GRANT EXECUTE ON FUNCTION public.sec_anon_selectable_tables() TO service_role;
GRANT EXECUTE ON FUNCTION public.sec_storage_public_buckets() TO service_role;
GRANT EXECUTE ON FUNCTION public.sec_tables_partial_policy_coverage() TO service_role;
