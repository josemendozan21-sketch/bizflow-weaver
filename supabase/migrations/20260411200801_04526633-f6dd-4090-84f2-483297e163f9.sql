CREATE POLICY "Contabilidad can update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'contabilidad'))
WITH CHECK (public.has_role(auth.uid(), 'contabilidad'));