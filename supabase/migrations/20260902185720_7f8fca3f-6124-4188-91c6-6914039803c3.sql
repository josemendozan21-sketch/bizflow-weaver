CREATE TABLE public.feria_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feria_id uuid NOT NULL REFERENCES public.ferias(id) ON DELETE CASCADE,
  shipment_number integer NOT NULL,
  direction text NOT NULL CHECK (direction IN ('salida','entrada')),
  status text NOT NULL DEFAULT 'confirmada' CHECK (status IN ('confirmada','anulada')),
  notes text,
  confirmed_by uuid,
  confirmed_by_name text,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feria_shipments TO authenticated;
GRANT ALL ON public.feria_shipments TO service_role;
ALTER TABLE public.feria_shipments ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX feria_shipments_number_uniq
  ON public.feria_shipments (feria_id, direction, shipment_number);
CREATE UNIQUE INDEX feria_shipments_single_entrada
  ON public.feria_shipments (feria_id)
  WHERE direction = 'entrada' AND status = 'confirmada';
CREATE INDEX feria_shipments_feria_idx ON public.feria_shipments (feria_id);

CREATE POLICY "Roles con acceso a ferias pueden ver despachos"
  ON public.feria_shipments FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'inventarios') OR
    public.has_role(auth.uid(),'logistica') OR
    public.has_role(auth.uid(),'contabilidad') OR
    public.has_role(auth.uid(),'visualizador')
  );

CREATE POLICY "Admin e inventarios crean despachos"
  ON public.feria_shipments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'inventarios'));

CREATE POLICY "Admin e inventarios actualizan despachos"
  ON public.feria_shipments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'inventarios'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'inventarios'));

CREATE POLICY "Admin elimina despachos"
  ON public.feria_shipments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_feria_shipments_updated_at
  BEFORE UPDATE ON public.feria_shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.feria_shipment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.feria_shipments(id) ON DELETE CASCADE,
  stock_item_id uuid,
  item_name text NOT NULL,
  brand text NOT NULL,
  logo text,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feria_shipment_items TO authenticated;
GRANT ALL ON public.feria_shipment_items TO service_role;
ALTER TABLE public.feria_shipment_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX feria_shipment_items_shipment_idx ON public.feria_shipment_items (shipment_id);

CREATE POLICY "Roles con acceso a ferias pueden ver items de despacho"
  ON public.feria_shipment_items FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'inventarios') OR
    public.has_role(auth.uid(),'logistica') OR
    public.has_role(auth.uid(),'contabilidad') OR
    public.has_role(auth.uid(),'visualizador')
  );

CREATE POLICY "Admin e inventarios crean items de despacho"
  ON public.feria_shipment_items FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'inventarios'));

CREATE POLICY "Admin e inventarios actualizan items de despacho"
  ON public.feria_shipment_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'inventarios'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'inventarios'));

CREATE POLICY "Admin elimina items de despacho"
  ON public.feria_shipment_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_feria_shipment_items_updated_at
  BEFORE UPDATE ON public.feria_shipment_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sincroniza feria_inventory con los items despachados / retornados
CREATE OR REPLACE FUNCTION public.sync_feria_inventory_from_shipment_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sh public.feria_shipments%ROWTYPE;
  target uuid;
  sign integer;
  rec RECORD;
BEGIN
  rec := COALESCE(NEW, OLD);
  SELECT * INTO sh FROM public.feria_shipments WHERE id = rec.shipment_id;
  IF sh.id IS NULL OR sh.status <> 'confirmada' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  sign := CASE WHEN TG_OP = 'DELETE' THEN -1 ELSE 1 END;

  SELECT id INTO target FROM public.feria_inventory
   WHERE feria_id = sh.feria_id
     AND brand = rec.brand
     AND lower(product_name) = lower(rec.item_name)
   LIMIT 1;

  IF target IS NULL THEN
    INSERT INTO public.feria_inventory (
      feria_id, brand, product_name, quantity_assigned, quantity_returned,
      quantity_dispatched, dispatch_status, unit_price, unit_cost
    ) VALUES (
      sh.feria_id, rec.brand, rec.item_name,
      CASE WHEN sh.direction = 'salida' THEN GREATEST(sign * rec.quantity, 0) ELSE 0 END,
      CASE WHEN sh.direction = 'entrada' THEN GREATEST(sign * rec.quantity, 0) ELSE 0 END,
      CASE WHEN sh.direction = 'salida' THEN GREATEST(sign * rec.quantity, 0) ELSE 0 END,
      CASE WHEN sh.direction = 'salida' THEN 'despachado' ELSE 'pendiente' END,
      rec.unit_price, rec.unit_cost
    );
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF sh.direction = 'salida' THEN
    UPDATE public.feria_inventory
       SET quantity_dispatched = GREATEST(COALESCE(quantity_dispatched,0) + sign * rec.quantity, 0),
           quantity_assigned = GREATEST(quantity_assigned, COALESCE(quantity_dispatched,0) + sign * rec.quantity),
           dispatch_status = 'despachado',
           updated_at = now()
     WHERE id = target;
  ELSE
    UPDATE public.feria_inventory
       SET quantity_returned = GREATEST(COALESCE(quantity_returned,0) + sign * rec.quantity, 0),
           updated_at = now()
     WHERE id = target;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_feria_inventory_from_shipment_item() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_sync_feria_inventory_item
  AFTER INSERT OR DELETE ON public.feria_shipment_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_feria_inventory_from_shipment_item();