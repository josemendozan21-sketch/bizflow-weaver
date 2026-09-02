ALTER TABLE public.production_batches
  ADD COLUMN IF NOT EXISTS return_reason text,
  ADD COLUMN IF NOT EXISTS returned_at timestamptz,
  ADD COLUMN IF NOT EXISTS returned_by uuid,
  ADD COLUMN IF NOT EXISTS returned_by_name text,
  ADD COLUMN IF NOT EXISTS return_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.revert_production_batch_reception(_batch_id uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uname text; b public.production_batches%ROWTYPE; qty numeric;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'inventarios')) THEN
    RAISE EXCEPTION 'Solo inventarios o administración pueden devolver un lote';
  END IF;
  IF COALESCE(btrim(_reason),'') = '' THEN
    RAISE EXCEPTION 'Debes indicar el motivo de la devolución';
  END IF;

  SELECT COALESCE(email,'Inventarios') INTO uname FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

  SELECT * INTO b FROM public.production_batches WHERE id = _batch_id FOR UPDATE;
  IF b.id IS NULL THEN RAISE EXCEPTION 'Lote no encontrado'; END IF;
  IF b.status <> 'recibido' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Solo se pueden devolver lotes ya recibidos');
  END IF;

  qty := COALESCE(b.received_quantity, 0);

  IF qty > 0 AND b.stock_item_id IS NOT NULL THEN
    INSERT INTO public.inventory_movements (
      stock_item_id, item_name, brand, category, quantity, direction, area,
      reason, recorded_by, recorded_by_name
    ) VALUES (
      b.stock_item_id, b.item_name, b.brand, b.category, qty, 'entrega', 'produccion',
      'Devolución de recepción lote #' || b.batch_number || ': ' || btrim(_reason),
      auth.uid(), uname
    );
  END IF;

  UPDATE public.production_batches
     SET status = 'en_proceso',
         received_quantity = NULL,
         received_at = NULL,
         received_by = NULL,
         received_by_name = NULL,
         return_reason = btrim(_reason),
         returned_at = now(),
         returned_by = auth.uid(),
         returned_by_name = uname,
         return_count = COALESCE(return_count,0) + 1
   WHERE id = _batch_id AND status = 'recibido';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'El lote ya cambió de estado');
  END IF;

  INSERT INTO public.notifications (target_role, title, message, type, reference_id)
  VALUES ('produccion', 'Lote devuelto por inventario',
    'Inventario devolvió el lote #' || b.batch_number || ' de "' || b.item_name || '" (' || qty ||
    ' uds revertidas). Motivo: ' || btrim(_reason),
    'warning', _batch_id);

  RETURN jsonb_build_object('ok', true, 'reverted', qty);
END; $$;

REVOKE EXECUTE ON FUNCTION public.revert_production_batch_reception(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revert_production_batch_reception(uuid, text) TO authenticated;