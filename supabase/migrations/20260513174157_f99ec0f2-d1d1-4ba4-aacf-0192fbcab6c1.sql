
-- Add new columns to inventory_requests
ALTER TABLE public.inventory_requests
  ADD COLUMN IF NOT EXISTS urgency text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS requester_person text,
  ADD COLUMN IF NOT EXISTS item_type text;

-- Add new columns to inventory_movements
ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS entry_type text,
  ADD COLUMN IF NOT EXISTS supplier text,
  ADD COLUMN IF NOT EXISTS proof_url text;

-- Trigger: notify Inventarios when a new wholesale order is created
CREATE OR REPLACE FUNCTION public.notify_inventarios_new_mayor_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.sale_type = 'mayor' THEN
    INSERT INTO public.notifications (target_role, title, message, type, reference_id)
    VALUES (
      'inventarios',
      'Nuevo pedido al por mayor',
      'Pedido de "' || NEW.client_name || '": ' || NEW.quantity || ' uds de "' || NEW.product || '" (' || NEW.brand || ').',
      'info',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_inventarios_new_mayor_order ON public.orders;
CREATE TRIGGER trg_notify_inventarios_new_mayor_order
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_inventarios_new_mayor_order();

-- Trigger: auto-create inventory_request for retail orders so Inventarios can deliver to Logistica
CREATE OR REPLACE FUNCTION public.auto_create_retail_inventory_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  matched_item_id uuid;
BEGIN
  IF NEW.sale_type <> 'detal' THEN
    RETURN NEW;
  END IF;

  -- Try to match a finished-product stock item by brand + product name
  SELECT id INTO matched_item_id
    FROM public.stock_items
    WHERE brand = NEW.brand
      AND category = 'producto_terminado'
      AND lower(name) = lower(NEW.product)
    LIMIT 1;

  INSERT INTO public.inventory_requests (
    requester_id, requester_name, requester_area,
    brand, category, stock_item_id, item_name, quantity,
    reason, order_id, routed_to, item_type, urgency
  ) VALUES (
    NEW.advisor_id,
    COALESCE(NEW.advisor_name, 'Asesor'),
    'asesor_comercial',
    NEW.brand,
    'producto_terminado',
    matched_item_id,
    NEW.product,
    GREATEST(NEW.quantity, 1),
    'Pedido al detal de ' || NEW.client_name,
    NEW.id,
    'logistica',
    'producto_terminado',
    'normal'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_retail_inventory_request ON public.orders;
CREATE TRIGGER trg_auto_create_retail_inventory_request
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_retail_inventory_request();
