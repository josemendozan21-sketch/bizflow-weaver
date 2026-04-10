
-- Fix overly permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated can create supply orders" ON public.production_supply_orders;

CREATE POLICY "Authorized roles can create supply orders"
ON public.production_supply_orders FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'produccion'::app_role) OR
  has_role(auth.uid(), 'asesor_comercial'::app_role)
);
