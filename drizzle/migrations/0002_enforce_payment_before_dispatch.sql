CREATE OR REPLACE FUNCTION public.enforce_payment_before_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_becomes_dispatched boolean;
BEGIN
  IF NEW.sale_type IS DISTINCT FROM 'mayor' THEN
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.is_credit, false) THEN
    RETURN NEW;
  END IF;

  v_becomes_dispatched :=
    (NEW.production_status IN ('despachado','entregado')
      AND COALESCE(OLD.production_status, '') NOT IN ('despachado','entregado'))
    OR (NEW.dispatched_at IS NOT NULL AND OLD.dispatched_at IS NULL);

  IF v_becomes_dispatched
     AND COALESCE(NEW.abono, 0) < COALESCE(NEW.total_amount, 0) THEN
    RAISE EXCEPTION 'El pedido % no puede despacharse: tiene saldo pendiente de $%',
      COALESCE(NEW.order_code, NEW.id::text),
      to_char(COALESCE(NEW.total_amount,0) - COALESCE(NEW.abono,0), 'FM999G999G999');
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_payment_before_dispatch ON public.orders;
CREATE TRIGGER trg_enforce_payment_before_dispatch
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_payment_before_dispatch();