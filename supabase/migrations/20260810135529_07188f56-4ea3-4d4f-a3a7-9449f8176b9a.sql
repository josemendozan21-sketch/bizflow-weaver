CREATE POLICY "Estampacion can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'estampacion'::app_role));