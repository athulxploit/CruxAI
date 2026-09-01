
CREATE OR REPLACE FUNCTION public.sec_tables_without_rls()
 RETURNS TABLE(tablename text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT c.relname::text
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relkind = 'r'
     AND c.relrowsecurity = false;
$$;

CREATE OR REPLACE FUNCTION public.sec_tables_without_policies()
 RETURNS TABLE(tablename text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT c.relname::text
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relkind = 'r'
     AND c.relrowsecurity = true
     AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid);
$$;

CREATE OR REPLACE FUNCTION public.sec_definer_executable_by_authenticated()
 RETURNS TABLE(function_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT (n.nspname || '.' || p.proname)::text
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.prosecdef = true
     AND has_function_privilege('authenticated', p.oid, 'EXECUTE');
$$;

REVOKE EXECUTE ON FUNCTION public.sec_tables_without_rls() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.sec_tables_without_policies() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.sec_definer_executable_by_authenticated() FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.sec_tables_without_rls() TO service_role;
GRANT EXECUTE ON FUNCTION public.sec_tables_without_policies() TO service_role;
GRANT EXECUTE ON FUNCTION public.sec_definer_executable_by_authenticated() TO service_role;
