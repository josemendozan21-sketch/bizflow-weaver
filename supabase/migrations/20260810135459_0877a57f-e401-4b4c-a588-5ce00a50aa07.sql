CREATE POLICY "Estampacion can create production orders"
ON public.production_orders
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'estampacion'::app_role));