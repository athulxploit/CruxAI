
-- feature_flags: authenticated-only read
DROP POLICY IF EXISTS "flags read all" ON public.feature_flags;
CREATE POLICY "flags read authenticated" ON public.feature_flags
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.feature_flags FROM anon;

-- model_assignments: authenticated-only read
DROP POLICY IF EXISTS "models read all" ON public.model_assignments;
CREATE POLICY "models read authenticated" ON public.model_assignments
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.model_assignments FROM anon;

-- announcements: authenticated-only read
DROP POLICY IF EXISTS "announce read all" ON public.announcements;
CREATE POLICY "announce read authenticated" ON public.announcements
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.announcements FROM anon;
