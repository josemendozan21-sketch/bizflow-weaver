ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_payment_mode text NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS shipping_set_at timestamptz,
  ADD COLUMN IF NOT EXISTS shipping_set_by_name text;

UPDATE public.orders
SET shipping_payment_mode = CASE
  WHEN payment_method = 'contra_entrega' THEN 'contraentrega'
  WHEN COALESCE(shipping_cost,0) > 0 AND (payment_complete IS TRUE OR payment_method IN ('pagado','obsequio')) THEN 'incluido_anticipos'
  WHEN COALESCE(shipping_cost,0) > 0 THEN 'por_cobrar'
  ELSE 'pendiente'
END
WHERE shipping_payment_mode = 'pendiente';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='orders'
      AND policyname='Advisors accounting admin can set shipping'
  ) THEN
    CREATE POLICY "Advisors accounting admin can set shipping"
      ON public.orders FOR UPDATE TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'contabilidad')
        OR (public.has_role(auth.uid(), 'asesor_comercial') AND advisor_id = auth.uid())
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'contabilidad')
        OR (public.has_role(auth.uid(), 'asesor_comercial') AND advisor_id = auth.uid())
      );
  END IF;
END $$;