CREATE OR REPLACE FUNCTION public.consume_stock_item(_item_id uuid, _amount numeric, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur numeric;
  applied numeric;
  shortfall numeric;
  it record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cantidad inválida');
  END IF;

  SELECT * INTO it FROM public.stock_items WHERE id = _item_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ítem no encontrado');
  END IF;

  cur := GREATEST(COALESCE(it.available, 0), 0);
  applied := LEAST(cur, _amount);
  shortfall := _amount - applied;

  UPDATE public.stock_items SET available = cur - applied WHERE id = _item_id;

  INSERT INTO public.inventory_audit_log (
    table_name, record_id, action, item_name, brand, category, product_type,
    field, old_value, new_value, changed_by, changed_by_email, logo
  ) VALUES (
    'stock_items', _item_id, 'consumo_automatico', it.name, it.brand, it.category, it.product_type,
    'available', COALESCE(it.available, 0)::text, (cur - applied)::text,
    auth.uid(), (SELECT email FROM public.profiles WHERE user_id = auth.uid() LIMIT 1),
    it.logo
  );

  RETURN jsonb_build_object(
    'success', true,
    'applied', applied,
    'shortfall', shortfall,
    'new_available', cur - applied,
    'item_name', it.name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_stock_item(uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_stock_item(uuid, numeric, text) TO authenticated;