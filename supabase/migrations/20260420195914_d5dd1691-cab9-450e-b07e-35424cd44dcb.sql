DROP POLICY IF EXISTS "Advisors can update their own requests" ON public.logo_requests;

CREATE POLICY "Advisors can update logo requests"
ON public.logo_requests
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'asesor_comercial'::app_role))
WITH CHECK (has_role(auth.uid(), 'asesor_comercial'::app_role));