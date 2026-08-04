CREATE OR REPLACE FUNCTION public.prevent_duplicate_orders()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.orders
    WHERE brand = NEW.brand
      AND client_name = NEW.client_name
      AND product = NEW.product
      AND quantity = NEW.quantity
      AND COALESCE(advisor_id::text,'') = COALESCE(NEW.advisor_id::text,'')
      AND created_at > now() - interval '2 minutes'
  ) THEN
    RAISE EXCEPTION 'Pedido duplicado detectado (mismo cliente y producto en menos de 2 minutos)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_orders ON public.orders;
CREATE TRIGGER trg_prevent_duplicate_orders
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_orders();