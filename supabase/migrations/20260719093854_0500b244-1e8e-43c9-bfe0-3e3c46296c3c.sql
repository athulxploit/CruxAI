
-- Real Postgres catalog probes for the security scan panel.
-- All are SECURITY DEFINER, admin-gated via has_role().

CREATE OR REPLACE FUNCTION public.sec_tables_without_rls()
RETURNS TABLE(tablename text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
  SELECT c.relname::text
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relkind = 'r'
     AND c.relrowsecurity = false;
END $$;

CREATE OR REPLACE FUNCTION public.sec_tables_without_policies()
RETURNS TABLE(tablename text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
  SELECT c.relname::text
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relkind = 'r'
     AND c.relrowsecurity = true
     AND NOT EXISTS (
       SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid
     );
END $$;

CREATE OR REPLACE FUNCTION public.sec_definer_executable_by_authenticated()
RETURNS TABLE(function_name text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
  SELECT (n.nspname || '.' || p.proname)::text
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.prosecdef = true
     AND has_function_privilege('authenticated', p.oid, 'EXECUTE');
END $$;

-- Only admins may call these; revoke defaults and grant to authenticated
-- (the functions themselves re-check the admin role).
REVOKE EXECUTE ON FUNCTION public.sec_tables_without_rls() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sec_tables_without_policies() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sec_definer_executable_by_authenticated() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sec_tables_without_rls() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sec_tables_without_policies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sec_definer_executable_by_authenticated() TO authenticated;
