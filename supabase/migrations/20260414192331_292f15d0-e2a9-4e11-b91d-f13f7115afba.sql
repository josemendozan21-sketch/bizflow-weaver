CREATE POLICY "Advisors can update stamp approvals on own orders"
ON public.production_orders
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'asesor_comercial'::app_role) AND advisor_id = auth.uid())
WITH CHECK (has_role(auth.uid(), 'asesor_comercial'::app_role) AND advisor_id = auth.uid());