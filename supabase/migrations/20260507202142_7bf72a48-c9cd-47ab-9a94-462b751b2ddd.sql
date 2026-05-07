
-- Inventory requests table for stock dispatch approval workflow
CREATE TABLE public.inventory_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id uuid NOT NULL,
  requester_name text NOT NULL,
  requester_area text NOT NULL CHECK (requester_area IN ('produccion','estampacion','logistica','asesor_comercial','admin','inventarios')),
  brand text NOT NULL,
  category text NOT NULL CHECK (category IN ('cuerpos_referencias','producto_terminado')),
  stock_item_id uuid,
  item_name text NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  reason text,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','aprobada','rechazada')),
  reviewed_by uuid,
  reviewed_by_name text,
  reviewed_at timestamptz,
  rejection_reason text,
  order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_inventory_requests_status ON public.inventory_requests(status);
CREATE INDEX idx_inventory_requests_requester ON public.inventory_requests(requester_id);

CREATE TRIGGER trg_inv_req_updated_at
  BEFORE UPDATE ON public.inventory_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
CREATE POLICY "Inventarios and admin manage inventory_requests"
  ON public.inventory_requests FOR ALL TO authenticated
  USING (has_role(auth.uid(),'inventarios') OR has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'inventarios') OR has_role(auth.uid(),'admin'));

CREATE POLICY "Requesters can create their own requests"
  ON public.inventory_requests FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Requesters can view their own requests"
  ON public.inventory_requests FOR SELECT TO authenticated
  USING (requester_id = auth.uid());

CREATE POLICY "Inventarios can view all"
  ON public.inventory_requests FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'inventarios') OR has_role(auth.uid(),'admin'));

-- Trigger that on approval decrements stock
CREATE OR REPLACE FUNCTION public.process_inventory_request_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_available numeric;
  reviewer_name text;
BEGIN
  IF NEW.status = 'aprobada' AND OLD.status <> 'aprobada' THEN
    -- Lookup stock_item by id (preferred) or by name+brand+category
    IF NEW.stock_item_id IS NOT NULL THEN
      SELECT available INTO current_available FROM public.stock_items WHERE id = NEW.stock_item_id;
    ELSE
      SELECT available, id INTO current_available, NEW.stock_item_id
        FROM public.stock_items
        WHERE name = NEW.item_name AND brand = NEW.brand AND category = NEW.category
        LIMIT 1;
    END IF;

    IF current_available IS NULL THEN
      RAISE EXCEPTION 'Ítem de inventario no encontrado';
    END IF;

    IF current_available < NEW.quantity THEN
      RAISE EXCEPTION 'Stock insuficiente: disponible %, solicitado %', current_available, NEW.quantity;
    END IF;

    UPDATE public.stock_items
       SET available = available - NEW.quantity
     WHERE id = NEW.stock_item_id;

    -- Mirror update on body_stock when applicable (magical cuerpos)
    IF NEW.category = 'cuerpos_referencias' THEN
      UPDATE public.body_stock
         SET available = GREATEST(available - NEW.quantity, 0)
       WHERE referencia = NEW.item_name AND brand = NEW.brand;
    END IF;

    NEW.reviewed_at := now();
    IF NEW.reviewed_by IS NULL THEN
      NEW.reviewed_by := auth.uid();
    END IF;

    -- Notify requester
    INSERT INTO public.notifications (target_user_id, target_role, title, message, type, reference_id)
    VALUES (
      NEW.requester_id,
      NEW.requester_area::app_role,
      'Solicitud aprobada',
      'Tu solicitud de ' || NEW.quantity || ' uds de "' || NEW.item_name || '" fue aprobada.',
      'success',
      NEW.id
    );
  ELSIF NEW.status = 'rechazada' AND OLD.status <> 'rechazada' THEN
    NEW.reviewed_at := now();
    IF NEW.reviewed_by IS NULL THEN
      NEW.reviewed_by := auth.uid();
    END IF;

    INSERT INTO public.notifications (target_user_id, target_role, title, message, type, reference_id)
    VALUES (
      NEW.requester_id,
      NEW.requester_area::app_role,
      'Solicitud rechazada',
      'Tu solicitud de ' || NEW.quantity || ' uds de "' || NEW.item_name || '" fue rechazada.' || COALESCE(' Motivo: ' || NEW.rejection_reason, ''),
      'warning',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inventory_request_approval
  BEFORE UPDATE ON public.inventory_requests
  FOR EACH ROW EXECUTE FUNCTION public.process_inventory_request_approval();

-- Notify inventarios on new request
CREATE OR REPLACE FUNCTION public.notify_new_inventory_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (target_role, title, message, type, reference_id)
  VALUES (
    'inventarios',
    'Nueva solicitud de inventario',
    NEW.requester_name || ' (' || NEW.requester_area || ') solicita ' || NEW.quantity || ' uds de "' || NEW.item_name || '".',
    'info',
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_inventory_request
  AFTER INSERT ON public.inventory_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_inventory_request();

ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_requests;
