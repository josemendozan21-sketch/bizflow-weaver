
-- stock_items
CREATE POLICY "Inventarios can manage stock items"
ON public.stock_items FOR ALL TO authenticated
USING (has_role(auth.uid(), 'inventarios'::app_role))
WITH CHECK (has_role(auth.uid(), 'inventarios'::app_role));

-- body_stock
CREATE POLICY "Inventarios can manage body stock"
ON public.body_stock FOR ALL TO authenticated
USING (has_role(auth.uid(), 'inventarios'::app_role))
WITH CHECK (has_role(auth.uid(), 'inventarios'::app_role));

-- body_production_tasks
CREATE POLICY "Inventarios can manage body tasks"
ON public.body_production_tasks FOR ALL TO authenticated
USING (has_role(auth.uid(), 'inventarios'::app_role))
WITH CHECK (has_role(auth.uid(), 'inventarios'::app_role));

-- production_supply_orders
CREATE POLICY "Inventarios can create supply orders"
ON public.production_supply_orders FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'inventarios'::app_role));

CREATE POLICY "Inventarios can update supply orders"
ON public.production_supply_orders FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'inventarios'::app_role))
WITH CHECK (has_role(auth.uid(), 'inventarios'::app_role));

-- notifications
CREATE POLICY "Inventarios can create notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'inventarios'::app_role));
