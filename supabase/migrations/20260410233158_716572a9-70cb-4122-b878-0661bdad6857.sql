CREATE POLICY "Designers can update logo requests"
ON public.logo_requests
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'disenador'::app_role))
WITH CHECK (has_role(auth.uid(), 'disenador'::app_role));