CREATE POLICY "Inventarios can view orders" ON public.orders FOR SELECT TO authenticated USING (has_role(auth.uid(), 'inventarios'::app_role));

CREATE POLICY "Inventarios can update orders" ON public.orders FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'inventarios'::app_role)) WITH CHECK (has_role(auth.uid(), 'inventarios'::app_role));