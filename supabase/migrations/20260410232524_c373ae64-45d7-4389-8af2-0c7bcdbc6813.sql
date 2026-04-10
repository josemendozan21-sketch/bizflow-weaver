-- Estampacion can update production_orders
CREATE POLICY "Estampacion can update production orders"
ON public.production_orders
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'estampacion'::app_role))
WITH CHECK (has_role(auth.uid(), 'estampacion'::app_role));

-- Estampacion can update orders (parent order status sync)
CREATE POLICY "Estampacion can update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'estampacion'::app_role))
WITH CHECK (has_role(auth.uid(), 'estampacion'::app_role));