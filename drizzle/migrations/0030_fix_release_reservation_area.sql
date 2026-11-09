CREATE OR REPLACE FUNCTION public.release_order_reservation(_reservation_id uuid, _reason text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  res public.order_reservations%ROWTYPE;
  uname text;
  ord public.orders%ROWTYPE;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'inventarios')) THEN
    RAISE EXCEPTION 'Solo inventarios o administración pueden liberar reservas';
  END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN
    RAISE EXCEPTION 'Debe indicar el motivo de la liberación';
  END IF;
  SELECT * INTO res FROM public.order_reservations WHERE id = _reservation_id FOR UPDATE;
  IF res.id IS NULL THEN RAISE EXCEPTION 'Reserva no encontrada'; END IF;
  IF res.status <> 'activa' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Esta reserva ya no está activa');
  END IF;
  SELECT COALESCE(email, 'Inventarios') INTO uname FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  SELECT * INTO ord FROM public.orders WHERE id = res.order_id;

  INSERT INTO public.inventory_movements (
    stock_item_id, item_name, brand, category, quantity, direction, area,
    movement_kind, reason, order_id, recorded_by, recorded_by_name
  ) VALUES (
    res.stock_item_id, res.item_name, res.brand, res.category, res.quantity, 'retorno', 'asesor_comercial',
    'liberar_reserva', 'Liberación manual: ' || _reason, res.order_id, auth.uid(), uname
  );
  UPDATE public.order_reservations
     SET status = 'liberada', released_at = now(), released_by = auth.uid(),
         released_by_name = uname, release_reason = _reason
   WHERE id = res.id;
  IF ord.advisor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (ord.advisor_id, 'Reserva de inventario liberada',
      'Se liberaron ' || res.quantity || ' uds de "' || res.item_name || '" del pedido ' ||
      COALESCE(res.order_code,'') || '. Motivo: ' || _reason, 'warning', res.order_id);
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$function$;