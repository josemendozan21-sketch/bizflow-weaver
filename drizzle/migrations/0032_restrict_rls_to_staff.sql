-- Only users with an assigned role (internal staff) may access internal data.
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;

-- SELECT policies that used USING (true)
DROP POLICY IF EXISTS "accounting_accounts_select" ON public.accounting_accounts;
CREATE POLICY "accounting_accounts_select" ON public.accounting_accounts FOR SELECT TO authenticated USING (public.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "accounting_amounts_select" ON public.accounting_monthly_amounts;
CREATE POLICY "accounting_amounts_select" ON public.accounting_monthly_amounts FOR SELECT TO authenticated USING (public.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "Authenticated view area_compliance_rules" ON public.area_compliance_rules;
CREATE POLICY "Authenticated view area_compliance_rules" ON public.area_compliance_rules FOR SELECT TO authenticated USING (public.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can view body stock" ON public.body_stock;
CREATE POLICY "Authenticated users can view body stock" ON public.body_stock FOR SELECT TO authenticated USING (public.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view commission rules" ON public.commission_rules;
CREATE POLICY "Authenticated can view commission rules" ON public.commission_rules FOR SELECT TO authenticated USING (public.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view company_documents" ON public.company_documents;
CREATE POLICY "Authenticated can view company_documents" ON public.company_documents FOR SELECT TO authenticated USING (public.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can view event products" ON public.event_products;
CREATE POLICY "Authenticated users can view event products" ON public.event_products FOR SELECT TO authenticated USING (public.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can view events" ON public.events;
CREATE POLICY "Authenticated users can view events" ON public.events FOR SELECT TO authenticated USING (public.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view feria inventory" ON public.feria_inventory;
CREATE POLICY "Authenticated can view feria inventory" ON public.feria_inventory FOR SELECT TO authenticated USING (public.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view ferias" ON public.ferias;
CREATE POLICY "Authenticated can view ferias" ON public.ferias FOR SELECT TO authenticated USING (public.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "Tiers viewable by all auth" ON public.loyalty_tiers;
CREATE POLICY "Tiers viewable by all auth" ON public.loyalty_tiers FOR SELECT TO authenticated USING (public.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view order deliveries" ON public.order_deliveries;
CREATE POLICY "Authenticated can view order deliveries" ON public.order_deliveries FOR SELECT TO authenticated USING (public.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "req_select_auth" ON public.order_requirements;
CREATE POLICY "req_select_auth" ON public.order_requirements FOR SELECT TO authenticated USING (public.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view reservations" ON public.order_reservations;
CREATE POLICY "Authenticated can view reservations" ON public.order_reservations FOR SELECT TO authenticated USING (public.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "batch_items_select_auth" ON public.production_batch_items;
CREATE POLICY "batch_items_select_auth" ON public.production_batch_items FOR SELECT TO authenticated USING (public.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "batch_select_auth" ON public.production_batches;
CREATE POLICY "batch_select_auth" ON public.production_batches FOR SELECT TO authenticated USING (public.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view stage logs" ON public.production_stage_logs;
CREATE POLICY "Authenticated can view stage logs" ON public.production_stage_logs FOR SELECT TO authenticated USING (public.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view supply orders" ON public.production_supply_orders;
CREATE POLICY "Authenticated can view supply orders" ON public.production_supply_orders FOR SELECT TO authenticated USING (public.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;
CREATE POLICY "Authenticated can view profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "Authenticated view roll_cuts" ON public.roll_cuts;
CREATE POLICY "Authenticated view roll_cuts" ON public.roll_cuts FOR SELECT TO authenticated USING (public.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "Authenticated view staff_members" ON public.staff_members;
CREATE POLICY "Authenticated view staff_members" ON public.staff_members FOR SELECT TO authenticated USING (public.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can view stock items" ON public.stock_items;
CREATE POLICY "Authenticated users can view stock items" ON public.stock_items FOR SELECT TO authenticated USING (public.is_staff((select auth.uid())));

-- Logs
DROP POLICY IF EXISTS "logo_status_log_insert" ON public.logo_request_status_log;
CREATE POLICY "logo_status_log_insert" ON public.logo_request_status_log FOR INSERT TO authenticated WITH CHECK (public.is_staff((select auth.uid())));
DROP POLICY IF EXISTS "logo_status_log_select" ON public.logo_request_status_log;
CREATE POLICY "logo_status_log_select" ON public.logo_request_status_log FOR SELECT TO authenticated USING (public.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "order_change_log_insert" ON public.order_change_log;
CREATE POLICY "order_change_log_insert" ON public.order_change_log FOR INSERT TO authenticated WITH CHECK (public.is_staff((select auth.uid())));
DROP POLICY IF EXISTS "order_change_log_select" ON public.order_change_log;
CREATE POLICY "order_change_log_select" ON public.order_change_log FOR SELECT TO authenticated USING (public.is_staff((select auth.uid())));

-- order_charges
DROP POLICY IF EXISTS "order_charges_select" ON public.order_charges;
CREATE POLICY "order_charges_select" ON public.order_charges FOR SELECT TO authenticated USING (public.is_staff((select auth.uid())));
DROP POLICY IF EXISTS "order_charges_insert" ON public.order_charges;
CREATE POLICY "order_charges_insert" ON public.order_charges FOR INSERT TO authenticated WITH CHECK (public.is_staff((select auth.uid())));
DROP POLICY IF EXISTS "order_charges_update" ON public.order_charges;
CREATE POLICY "order_charges_update" ON public.order_charges FOR UPDATE TO authenticated USING (public.is_staff((select auth.uid()))) WITH CHECK (public.is_staff((select auth.uid())));
DROP POLICY IF EXISTS "order_charges_delete" ON public.order_charges;
CREATE POLICY "order_charges_delete" ON public.order_charges FOR DELETE TO authenticated USING (public.is_staff((select auth.uid())));

-- social_events
DROP POLICY IF EXISTS "auth read events" ON public.social_events;
CREATE POLICY "auth read events" ON public.social_events FOR SELECT TO authenticated USING (public.is_staff((select auth.uid())));
DROP POLICY IF EXISTS "auth insert events" ON public.social_events;
CREATE POLICY "auth insert events" ON public.social_events FOR INSERT TO authenticated WITH CHECK (public.is_staff((select auth.uid())));
DROP POLICY IF EXISTS "auth update events" ON public.social_events;
CREATE POLICY "auth update events" ON public.social_events FOR UPDATE TO authenticated USING (public.is_staff((select auth.uid()))) WITH CHECK (public.is_staff((select auth.uid())));
DROP POLICY IF EXISTS "auth delete events" ON public.social_events;
CREATE POLICY "auth delete events" ON public.social_events FOR DELETE TO authenticated USING (public.is_staff((select auth.uid())));

-- social_ideas
DROP POLICY IF EXISTS "auth read ideas" ON public.social_ideas;
CREATE POLICY "auth read ideas" ON public.social_ideas FOR SELECT TO authenticated USING (public.is_staff((select auth.uid())));
DROP POLICY IF EXISTS "auth insert ideas" ON public.social_ideas;
CREATE POLICY "auth insert ideas" ON public.social_ideas FOR INSERT TO authenticated WITH CHECK (public.is_staff((select auth.uid())));
DROP POLICY IF EXISTS "auth update ideas" ON public.social_ideas;
CREATE POLICY "auth update ideas" ON public.social_ideas FOR UPDATE TO authenticated USING (public.is_staff((select auth.uid()))) WITH CHECK (public.is_staff((select auth.uid())));
DROP POLICY IF EXISTS "auth delete ideas" ON public.social_ideas;
CREATE POLICY "auth delete ideas" ON public.social_ideas FOR DELETE TO authenticated USING (public.is_staff((select auth.uid())));

-- staff_attendance
DROP POLICY IF EXISTS "Authenticated view staff_attendance" ON public.staff_attendance;
CREATE POLICY "Authenticated view staff_attendance" ON public.staff_attendance FOR SELECT TO authenticated USING (public.is_staff((select auth.uid())));
DROP POLICY IF EXISTS "Authenticated insert staff_attendance" ON public.staff_attendance;
CREATE POLICY "Authenticated insert staff_attendance" ON public.staff_attendance FOR INSERT TO authenticated WITH CHECK (public.is_staff((select auth.uid())));
DROP POLICY IF EXISTS "Authenticated update staff_attendance" ON public.staff_attendance;
CREATE POLICY "Authenticated update staff_attendance" ON public.staff_attendance FOR UPDATE TO authenticated USING (public.is_staff((select auth.uid()))) WITH CHECK (public.is_staff((select auth.uid())));

-- Storage: only staff may read company documents or write shared work files
DROP POLICY IF EXISTS "Authenticated can read company-documents" ON storage.objects;
CREATE POLICY "Authenticated can read company-documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'company-documents' AND public.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "Authenticated upload attendance photos" ON storage.objects;
CREATE POLICY "Authenticated upload attendance photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'attendance-photos' AND public.is_staff((select auth.uid())));
DROP POLICY IF EXISTS "Authenticated update attendance photos" ON storage.objects;
CREATE POLICY "Authenticated update attendance photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'attendance-photos' AND public.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can upload logo files" ON storage.objects;
CREATE POLICY "Authenticated users can upload logo files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logo-files' AND public.is_staff((select auth.uid())));
DROP POLICY IF EXISTS "Authenticated users can update logo files" ON storage.objects;
CREATE POLICY "Authenticated users can update logo files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'logo-files' AND public.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can upload stamping photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload stamping photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'stamping-photos' AND public.is_staff((select auth.uid())));
DROP POLICY IF EXISTS "Authenticated users can update stamping photos" ON storage.objects;
CREATE POLICY "Authenticated users can update stamping photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'stamping-photos' AND public.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can upload molde templates" ON storage.objects;
CREATE POLICY "Authenticated users can upload molde templates" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'molde-templates' AND public.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "POS photos authenticated upload" ON storage.objects;
CREATE POLICY "POS photos authenticated upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pos-product-photos' AND public.is_staff((select auth.uid())));
DROP POLICY IF EXISTS "POS photos authenticated update" ON storage.objects;
CREATE POLICY "POS photos authenticated update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'pos-product-photos' AND public.is_staff((select auth.uid())));
DROP POLICY IF EXISTS "POS photos authenticated delete" ON storage.objects;
CREATE POLICY "POS photos authenticated delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'pos-product-photos' AND public.is_staff((select auth.uid())));