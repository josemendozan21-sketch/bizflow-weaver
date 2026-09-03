DROP POLICY IF EXISTS "Advisors can view and update stock items" ON public.stock_items;
DROP POLICY IF EXISTS "Admins can manage stock items" ON public.stock_items;
DROP POLICY IF EXISTS "Production can manage stock items" ON public.stock_items;
DROP POLICY IF EXISTS "Stamping can manage stock items" ON public.stock_items;

CREATE POLICY "Admins can manage stock items" ON public.stock_items
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Production can manage stock items" ON public.stock_items
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'produccion'::app_role))
  WITH CHECK (has_role(auth.uid(), 'produccion'::app_role));

CREATE POLICY "Stamping can manage stock items" ON public.stock_items
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'estampacion'::app_role))
  WITH CHECK (has_role(auth.uid(), 'estampacion'::app_role));