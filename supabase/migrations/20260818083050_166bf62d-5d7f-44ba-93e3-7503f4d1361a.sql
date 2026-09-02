
-- Ensure all public tables have GRANTS for authenticated users and service_role.
-- Using a safer approach that checks for table existence.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.' || quote_ident(r.tablename) || ' TO authenticated;';
        EXECUTE 'GRANT ALL ON public.' || quote_ident(r.tablename) || ' TO service_role;';
    END LOOP;
END $$;

-- If tables were recently created and are not yet in pg_tables (unlikely but possible during migration), 
-- we ensure the XCOMM ones are handled if they exist.
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'model_registry') THEN
        GRANT SELECT ON public.model_registry TO authenticated;
        GRANT SELECT ON public.model_registry TO anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'model_assignments') THEN
        GRANT SELECT ON public.model_assignments TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'xcomm_model_usage') THEN
        GRANT SELECT, INSERT, UPDATE ON public.xcomm_model_usage TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'model_limits') THEN
        GRANT SELECT ON public.model_limits TO authenticated;
    END IF;
END $$;
