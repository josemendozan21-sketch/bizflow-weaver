CREATE POLICY "Designers can create logo requests"
ON public.logo_requests
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'disenador'::app_role));