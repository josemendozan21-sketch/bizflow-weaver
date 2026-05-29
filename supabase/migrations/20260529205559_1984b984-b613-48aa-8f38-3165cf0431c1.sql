CREATE POLICY "Produccion can insert inventory_movements"
ON public.inventory_movements
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'produccion'::app_role));