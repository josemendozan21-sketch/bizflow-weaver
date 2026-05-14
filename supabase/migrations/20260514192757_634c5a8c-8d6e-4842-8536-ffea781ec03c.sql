
-- ============================================================
-- 1. feria_staff: drop broad SELECT
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view feria staff" ON public.feria_staff;

-- ============================================================
-- 2. feria_sales: drop broad SELECT (feria POS policy already exists)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view feria sales" ON public.feria_sales;

-- ============================================================
-- 3. feria_dispatch_requests: drop broad SELECT, scope to roles + creator
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view dispatch requests" ON public.feria_dispatch_requests;

CREATE POLICY "Authorized roles view dispatch requests"
ON public.feria_dispatch_requests FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'logistica'::app_role)
  OR has_role(auth.uid(), 'contabilidad'::app_role)
  OR requested_by = auth.uid()
);

-- ============================================================
-- 4. logo_requests: drop broad SELECT, scope properly
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view logo requests" ON public.logo_requests;

CREATE POLICY "Authorized roles view logo requests"
ON public.logo_requests FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'disenador'::app_role)
  OR has_role(auth.uid(), 'produccion'::app_role)
  OR has_role(auth.uid(), 'estampacion'::app_role)
  OR (has_role(auth.uid(), 'asesor_comercial'::app_role) AND advisor_id = auth.uid())
);

-- ============================================================
-- 5. user_roles: explicit hardening (admin-only writes)
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 6. Storage buckets: make financial-proof buckets PRIVATE
-- ============================================================
UPDATE storage.buckets SET public = false
WHERE id IN ('payment-proofs','petty-cash-proofs','pos-cash-proofs');

-- payment-proofs: drop existing, add restricted
DROP POLICY IF EXISTS "Anyone can view payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload payment proofs" ON storage.objects;

CREATE POLICY "Authorized roles view payment proofs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'contabilidad'::app_role)
    OR has_role(auth.uid(), 'logistica'::app_role)
    OR has_role(auth.uid(), 'asesor_comercial'::app_role)
    OR has_role(auth.uid(), 'inventarios'::app_role)
  )
);

CREATE POLICY "Authorized roles upload payment proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'contabilidad'::app_role)
    OR has_role(auth.uid(), 'asesor_comercial'::app_role)
  )
);

-- petty-cash-proofs
DROP POLICY IF EXISTS "Authenticated can view petty cash proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload petty cash proofs" ON storage.objects;

CREATE POLICY "Admin/contabilidad view petty cash proofs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'petty-cash-proofs'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role))
);

CREATE POLICY "Admin/contabilidad upload petty cash proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'petty-cash-proofs'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role))
);

-- pos-cash-proofs
DROP POLICY IF EXISTS "Public read pos cash proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload pos cash proofs" ON storage.objects;

CREATE POLICY "Authorized roles view pos cash proofs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'pos-cash-proofs'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'contabilidad'::app_role)
    OR has_role(auth.uid(), 'pos_punto'::app_role)
  )
);

CREATE POLICY "POS/contabilidad/admin upload pos cash proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'pos-cash-proofs'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'contabilidad'::app_role)
    OR has_role(auth.uid(), 'pos_punto'::app_role)
  )
);

-- finished-products: tighten upload to production/admin (keep public read)
DROP POLICY IF EXISTS "Authenticated can upload finished photos" ON storage.objects;

CREATE POLICY "Production uploads finished photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'finished-products'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'produccion'::app_role) OR has_role(auth.uid(), 'estampacion'::app_role))
);

-- ============================================================
-- 7. Revoke anon execute on SECURITY DEFINER helpers
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_pos_for_location(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_pos_for_feria(uuid) FROM anon;
