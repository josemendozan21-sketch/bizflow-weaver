CREATE OR REPLACE FUNCTION public.resolve_order_value_dispute(
  _dispute_id uuid,
  _approve boolean,
  _note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.order_value_disputes%ROWTYPE;
  o public.orders%ROWTYPE;
  _name text;
  _qty numeric;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'contabilidad')) THEN
    RAISE EXCEPTION 'No autorizado para resolver solicitudes de corrección';
  END IF;

  SELECT * INTO d FROM public.order_value_disputes WHERE id = _dispute_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no encontrada'; END IF;
  IF d.status <> 'pendiente' THEN RAISE EXCEPTION 'La solicitud ya fue resuelta'; END IF;

  SELECT COALESCE(display_name, email) INTO _name FROM public.profiles WHERE user_id = auth.uid();

  IF _approve THEN
    SELECT * INTO o FROM public.orders WHERE id = d.order_id;
    _qty := NULLIF(COALESCE(o.quantity, 0), 0);
    UPDATE public.orders
    SET total_amount = d.proposed_amount,
        unit_price = CASE WHEN _qty IS NULL THEN unit_price ELSE ROUND(d.proposed_amount / _qty, 2) END,
        updated_at = now()
    WHERE id = d.order_id;
  END IF;

  UPDATE public.order_value_disputes
  SET status = CASE WHEN _approve THEN 'aprobada' ELSE 'rechazada' END,
      resolved_by = auth.uid(),
      resolved_by_name = _name,
      resolution_note = _note,
      resolved_at = now()
  WHERE id = _dispute_id;

  INSERT INTO public.notifications (target_role, target_user_id, title, message, type, reference_id)
  VALUES (
    'asesor_comercial',
    d.requested_by,
    CASE WHEN _approve THEN 'Corrección de valor aprobada' ELSE 'Corrección de valor rechazada' END,
    'Pedido ' || COALESCE((SELECT order_code FROM public.orders WHERE id = d.order_id), '')
      || ': valor propuesto $' || to_char(d.proposed_amount, 'FM999G999G999')
      || COALESCE(' — ' || _note, ''),
    CASE WHEN _approve THEN 'success' ELSE 'warning' END,
    d.order_id
  );

  RETURN jsonb_build_object('ok', true, 'approved', _approve);
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_order_value_dispute(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_order_value_dispute(uuid, boolean, text) TO authenticated, service_role;