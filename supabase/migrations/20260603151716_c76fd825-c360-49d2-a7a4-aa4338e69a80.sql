
-- 1) Borrar solicitud de inventario del duplicado
DELETE FROM public.inventory_requests WHERE order_id = 'c92e66a7-53f7-4e14-af03-cab1cd74e2f4';

-- 2) Borrar el pedido duplicado
DELETE FROM public.orders WHERE id = 'c92e66a7-53f7-4e14-af03-cab1cd74e2f4';

-- 3) Trigger anti-duplicado para pedidos entrantes del webhook (mismo cliente+producto+cantidad en <2min)
CREATE OR REPLACE FUNCTION public.prevent_duplicate_sweatspot_orders()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.brand = 'sweatspot' AND NEW.advisor_name ILIKE '%sweatspot%' THEN
    IF EXISTS (
      SELECT 1 FROM public.orders
      WHERE brand = NEW.brand
        AND client_name = NEW.client_name
        AND product = NEW.product
        AND quantity = NEW.quantity
        AND created_at > now() - interval '2 minutes'
    ) THEN
      RAISE EXCEPTION 'Duplicate Sweatspot order detected within 2 minutes window';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_sweatspot_orders ON public.orders;
CREATE TRIGGER trg_prevent_duplicate_sweatspot_orders
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_sweatspot_orders();
