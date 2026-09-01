GRANT INSERT ON public.notifications TO authenticated;
CREATE POLICY "Admins create notifications" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'));