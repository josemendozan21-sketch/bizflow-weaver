
CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id uuid REFERENCES public.stock_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  brand text NOT NULL,
  category text NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  direction text NOT NULL CHECK (direction IN ('entrega','retorno')),
  area text NOT NULL CHECK (area IN ('produccion','estampacion','logistica','asesor_comercial','feria')),
  feria_id uuid,
  reason text,
  order_id uuid,
  recorded_by uuid,
  recorded_by_name text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_movements_recorded_at ON public.inventory_movements(recorded_at DESC);
CREATE INDEX idx_inventory_movements_area ON public.inventory_movements(area);
CREATE INDEX idx_inventory_movements_stock_item ON public.inventory_movements(stock_item_id);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inventarios and admin manage movements"
  ON public.inventory_movements
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'inventarios') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'inventarios') OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.process_inventory_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_available numeric;
  target_role_name app_role;
BEGIN
  IF NEW.stock_item_id IS NULL THEN
    SELECT id, available INTO NEW.stock_item_id, current_available
      FROM public.stock_items
      WHERE name = NEW.item_name AND brand = NEW.brand AND category = NEW.category
      LIMIT 1;
  ELSE
    SELECT available INTO current_available FROM public.stock_items WHERE id = NEW.stock_item_id;
  END IF;

  IF NEW.stock_item_id IS NULL OR current_available IS NULL THEN
    RAISE EXCEPTION 'Ítem de inventario no encontrado';
  END IF;

  IF NEW.direction = 'entrega' THEN
    IF current_available < NEW.quantity THEN
      RAISE EXCEPTION 'Stock insuficiente: disponible %, solicitado %', current_available, NEW.quantity;
    END IF;
    UPDATE public.stock_items SET available = available - NEW.quantity WHERE id = NEW.stock_item_id;

    IF NEW.area = 'feria' THEN
      target_role_name := 'logistica';
    ELSIF NEW.area = 'asesor_comercial' THEN
      target_role_name := 'asesor_comercial';
    ELSE
      target_role_name := NEW.area::app_role;
    END IF;

    INSERT INTO public.notifications (target_role, title, message, type, reference_id)
    VALUES (
      target_role_name,
      'Entrega de inventario',
      'Inventarios entregó ' || NEW.quantity || ' uds de "' || NEW.item_name || '"' ||
      CASE WHEN NEW.area = 'feria' THEN ' para feria.' ELSE '.' END ||
      COALESCE(' Motivo: ' || NEW.reason, ''),
      'info',
      NEW.id
    );
  ELSE
    UPDATE public.stock_items SET available = available + NEW.quantity WHERE id = NEW.stock_item_id;
    INSERT INTO public.notifications (target_role, title, message, type, reference_id)
    VALUES (
      'inventarios',
      'Retorno a inventario',
      'Retorno de ' || NEW.quantity || ' uds de "' || NEW.item_name || '" desde ' || NEW.area ||
      COALESCE('. Motivo: ' || NEW.reason, ''),
      'info',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_process_inventory_movement
  BEFORE INSERT ON public.inventory_movements
  FOR EACH ROW EXECUTE FUNCTION public.process_inventory_movement();
