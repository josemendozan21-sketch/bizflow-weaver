CREATE OR REPLACE FUNCTION public.close_logo_requests_on_order_closed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.production_status IS DISTINCT FROM OLD.production_status
     AND NEW.production_status IN ('despachado','entregado','cancelado') THEN
    UPDATE public.logo_requests
       SET status = 'finalizado',
           updated_at = now()
     WHERE order_id = NEW.id
       AND status <> 'finalizado';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_close_logo_requests_on_order_closed ON public.orders;
CREATE TRIGGER trg_close_logo_requests_on_order_closed
AFTER UPDATE OF production_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.close_logo_requests_on_order_closed();