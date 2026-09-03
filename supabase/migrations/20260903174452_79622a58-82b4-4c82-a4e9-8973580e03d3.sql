CREATE OR REPLACE FUNCTION public.recalc_order_payments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_order uuid;
  paid_sum numeric;
  payment_count integer;
  ord_total numeric;
  ord_complete boolean;
BEGIN
  target_order := COALESCE(NEW.order_id, OLD.order_id);

  SELECT COALESCE(SUM(amount), 0), COUNT(*) INTO paid_sum, payment_count
  FROM public.order_payments
  WHERE order_id = target_order;

  SELECT COALESCE(total_amount, 0), COALESCE(payment_complete, false)
    INTO ord_total, ord_complete
  FROM public.orders WHERE id = target_order;

  IF payment_count = 0 THEN
    -- No hay pagos registrados: conservar el abono inicial del pedido
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.orders
  SET abono = GREATEST(paid_sum, CASE WHEN ord_complete THEN COALESCE(abono, 0) ELSE 0 END),
      -- Nunca revertir una confirmacion manual de pago completo
      payment_complete = ord_complete OR (ord_total > 0 AND paid_sum >= ord_total)
  WHERE id = target_order;

  RETURN COALESCE(NEW, OLD);
END;
$$;