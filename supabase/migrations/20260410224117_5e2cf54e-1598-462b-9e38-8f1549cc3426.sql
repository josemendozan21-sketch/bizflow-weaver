CREATE POLICY "Advisors can update own orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'asesor_comercial'::app_role) AND advisor_id = auth.uid())
WITH CHECK (has_role(auth.uid(), 'asesor_comercial'::app_role) AND advisor_id = auth.uid());