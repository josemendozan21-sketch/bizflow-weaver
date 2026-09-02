ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivered_quantity integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.order_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  delivered_at date NOT NULL DEFAULT CURRENT_DATE,
  delivered_by uuid,
  delivered_by_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_deliveries_order_id ON public.order_deliveries(order_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_deliveries TO authenticated;
GRANT ALL ON public.order_deliveries TO service_role;

ALTER TABLE public.order_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view order deliveries" ON public.order_deliveries;
CREATE POLICY "Authenticated can view order deliveries"
ON public.order_deliveries FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Ops roles can insert order deliveries" ON public.order_deliveries;
CREATE POLICY "Ops roles can insert order deliveries"
ON public.order_deliveries FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'inventarios')
  OR public.has_role(auth.uid(), 'logistica')
  OR public.has_role(auth.uid(), 'produccion')
);

DROP POLICY IF EXISTS "Ops roles can update order deliveries" ON public.order_deliveries;
CREATE POLICY "Ops roles can update order deliveries"
ON public.order_deliveries FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'inventarios')
  OR public.has_role(auth.uid(), 'logistica')
  OR public.has_role(auth.uid(), 'produccion')
);

DROP POLICY IF EXISTS "Ops roles can delete order deliveries" ON public.order_deliveries;
CREATE POLICY "Ops roles can delete order deliveries"
ON public.order_deliveries FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'inventarios')
  OR public.has_role(auth.uid(), 'logistica')
);

CREATE TRIGGER trg_order_deliveries_updated_at
BEFORE UPDATE ON public.order_deliveries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_order_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_qty integer;
  already integer;
BEGIN
  IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad entregada debe ser mayor a cero';
  END IF;

  SELECT quantity INTO total_qty FROM public.orders WHERE id = NEW.order_id;
  IF total_qty IS NULL THEN
    RAISE EXCEPTION 'Pedido no encontrado';
  END IF;

  SELECT COALESCE(SUM(quantity), 0) INTO already
    FROM public.order_deliveries
   WHERE order_id = NEW.order_id
     AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF already + NEW.quantity > total_qty THEN
    RAISE EXCEPTION 'No se puede entregar % uds: el pedido es de % y ya se entregaron %', NEW.quantity, total_qty, already;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_order_delivery
BEFORE INSERT OR UPDATE ON public.order_deliveries
FOR EACH ROW EXECUTE FUNCTION public.validate_order_delivery();

CREATE OR REPLACE FUNCTION public.recalc_order_delivered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target uuid;
  total_delivered integer;
  total_qty integer;
BEGIN
  target := COALESCE(NEW.order_id, OLD.order_id);

  SELECT COALESCE(SUM(quantity), 0) INTO total_delivered
    FROM public.order_deliveries WHERE order_id = target;

  SELECT quantity INTO total_qty FROM public.orders WHERE id = target;

  UPDATE public.orders
     SET delivered_quantity = total_delivered,
         production_status = CASE
           WHEN total_qty IS NOT NULL AND total_delivered >= total_qty
                AND production_status NOT IN ('despachado','entregado')
             THEN 'despachado'
           ELSE production_status END,
         dispatched_at = CASE
           WHEN total_qty IS NOT NULL AND total_delivered >= total_qty AND dispatched_at IS NULL
             THEN CURRENT_DATE
           ELSE dispatched_at END
   WHERE id = target;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_recalc_order_delivered
AFTER INSERT OR UPDATE OR DELETE ON public.order_deliveries
FOR EACH ROW EXECUTE FUNCTION public.recalc_order_delivered();