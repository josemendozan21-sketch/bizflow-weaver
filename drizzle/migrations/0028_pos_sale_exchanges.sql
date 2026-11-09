CREATE TABLE public.pos_sale_exchanges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.pos_locations(id) ON DELETE CASCADE,
  original_sale_id uuid NOT NULL REFERENCES public.pos_sales(id) ON DELETE CASCADE,
  exchange_sale_id uuid NOT NULL REFERENCES public.pos_sales(id) ON DELETE CASCADE,
  returned_value numeric NOT NULL DEFAULT 0,
  new_value numeric NOT NULL DEFAULT 0,
  difference numeric NOT NULL DEFAULT 0,
  settlement text NOT NULL DEFAULT 'cobro',
  credit_amount numeric NOT NULL DEFAULT 0,
  notes text,
  recorded_by uuid,
  recorded_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pos_sale_exchanges TO authenticated;
GRANT ALL ON public.pos_sale_exchanges TO service_role;
ALTER TABLE public.pos_sale_exchanges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver cambios POS" ON public.pos_sale_exchanges FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contabilidad') OR public.has_role(auth.uid(),'visualizador')
  OR (public.has_role(auth.uid(),'pos_punto') AND public.is_pos_for_location(location_id)));

CREATE OR REPLACE FUNCTION public.register_pos_exchange(_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o public.pos_sales%ROWTYPE;
  r jsonb; p public.pos_products%ROWTYPE;
  _qty numeric; _sold numeric; _prev numeric; _price numeric;
  _ret numeric := 0; _new numeric := 0; _diff numeric; _total numeric; _credit numeric := 0;
  _settle text := coalesce(_payload->>'settlement','cobro');
  _method text; _sale_id uuid; _uname text; _note text;
BEGIN
  SELECT * INTO o FROM public.pos_sales WHERE id = (_payload->>'original_sale_id')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venta original no encontrada'; END IF;
  IF NOT (public.has_role(auth.uid(),'admin') OR (public.has_role(auth.uid(),'pos_punto') AND public.is_pos_for_location(o.location_id))) THEN
    RAISE EXCEPTION 'Sin permiso para registrar cambios en este punto';
  END IF;
  IF coalesce(jsonb_array_length(_payload->'returned'),0) = 0 THEN RAISE EXCEPTION 'Selecciona al menos una prenda devuelta'; END IF;
  SELECT email INTO _uname FROM auth.users WHERE id = auth.uid();

  -- valida y valora lo devuelto
  FOR r IN SELECT * FROM jsonb_array_elements(_payload->'returned') LOOP
    _qty := (r->>'quantity')::numeric;
    IF _qty IS NULL OR _qty <= 0 THEN RAISE EXCEPTION 'Cantidad devuelta inválida'; END IF;
    SELECT coalesce(sum(quantity),0), max(unit_price) INTO _sold, _price FROM public.pos_sale_items
      WHERE sale_id = o.id AND pos_product_id = (r->>'pos_product_id')::uuid;
    SELECT coalesce(-sum(i.quantity),0) INTO _prev FROM public.pos_sale_items i
      JOIN public.pos_sale_exchanges e ON e.exchange_sale_id = i.sale_id
      WHERE e.original_sale_id = o.id AND i.pos_product_id = (r->>'pos_product_id')::uuid AND i.quantity < 0;
    IF _qty > _sold - _prev THEN RAISE EXCEPTION 'No se puede devolver más de lo vendido (disponible para cambio: %)', _sold - _prev; END IF;
    _ret := _ret + _qty * _price;
  END LOOP;
  FOR r IN SELECT * FROM coalesce(_payload->'new_items','[]'::jsonb) x LOOP NULL; END LOOP;
  FOR r IN SELECT * FROM jsonb_array_elements(coalesce(_payload->'new_items','[]'::jsonb)) LOOP
    _qty := (r->>'quantity')::numeric;
    IF _qty IS NULL OR _qty <= 0 THEN RAISE EXCEPTION 'Cantidad nueva inválida'; END IF;
    SELECT * INTO p FROM public.pos_products WHERE id = (r->>'pos_product_id')::uuid AND location_id = o.location_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Producto no pertenece a este punto'; END IF;
    _new := _new + _qty * round(coalesce((r->>'unit_price')::numeric, p.sale_price));
  END LOOP;

  _diff := round(_new - _ret);
  IF _diff > 0 THEN _settle := 'cobro'; _method := coalesce(_payload->>'payment_method','efectivo'); _total := _diff;
  ELSIF _diff = 0 THEN _settle := 'sin_diferencia'; _method := coalesce(o.payment_method,'efectivo'); _total := 0;
  ELSIF _settle = 'devolucion' THEN _method := coalesce(_payload->>'payment_method','efectivo'); _total := _diff;
  ELSE _settle := 'saldo_favor'; _method := coalesce(o.payment_method,'efectivo'); _total := 0; _credit := -_diff;
  END IF;

  _note := 'CAMBIO de venta ' || upper(left(o.id::text,8)) || ' (' || to_char(o.sale_date AT TIME ZONE 'America/Bogota','DD/MM/YYYY') || '). Devuelto $' || _ret || ', nuevo $' || _new ||
    CASE _settle WHEN 'cobro' THEN ', cobrado $' || _diff WHEN 'devolucion' THEN ', devuelto al cliente $' || (-_diff) WHEN 'saldo_favor' THEN ', saldo a favor $' || _credit ELSE ', sin diferencia' END ||
    coalesce('. ' || nullif(_payload->>'notes',''), '');

  INSERT INTO public.pos_sales(location_id, client_name, client_phone, client_email, client_document, client_address, client_city, customer_id,
    payment_method, total_amount, total_cost, discount, notes, recorded_by, recorded_by_name)
  VALUES (o.location_id, o.client_name, o.client_phone, o.client_email, o.client_document, o.client_address, o.client_city, o.customer_id,
    _method, _total, 0, 0, _note, auth.uid(), _uname)
  RETURNING id INTO _sale_id;

  FOR r IN SELECT * FROM jsonb_array_elements(_payload->'returned') LOOP
    _qty := (r->>'quantity')::numeric;
    SELECT * INTO p FROM public.pos_products WHERE id = (r->>'pos_product_id')::uuid;
    SELECT max(unit_price) INTO _price FROM public.pos_sale_items WHERE sale_id = o.id AND pos_product_id = p.id;
    INSERT INTO public.pos_sale_items(sale_id,pos_product_id,product_name,brand,quantity,unit_price,unit_cost,line_total)
      VALUES (_sale_id,p.id,p.name,p.brand,-_qty,_price,p.avg_cost,-_qty*_price);
    UPDATE public.pos_products SET available = available + _qty WHERE id = p.id;
    INSERT INTO public.pos_inventory_movements(location_id,pos_product_id,product_name,direction,source,quantity,unit_cost,unit_price,reference_id,notes,recorded_by,recorded_by_name)
      VALUES (o.location_id,p.id,p.name,'entrada','devolucion',_qty,p.avg_cost,_price,_sale_id,'Devolución por cambio',auth.uid(),_uname);
  END LOOP;
  FOR r IN SELECT * FROM jsonb_array_elements(coalesce(_payload->'new_items','[]'::jsonb)) LOOP
    _qty := (r->>'quantity')::numeric;
    SELECT * INTO p FROM public.pos_products WHERE id = (r->>'pos_product_id')::uuid;
    _price := round(coalesce((r->>'unit_price')::numeric, p.sale_price));
    INSERT INTO public.pos_sale_items(sale_id,pos_product_id,product_name,brand,quantity,unit_price,unit_cost,line_total)
      VALUES (_sale_id,p.id,p.name,p.brand,_qty,_price,p.avg_cost,_qty*_price);
    UPDATE public.pos_products SET available = available - _qty WHERE id = p.id;
    INSERT INTO public.pos_inventory_movements(location_id,pos_product_id,product_name,direction,source,quantity,unit_cost,unit_price,reference_id,notes,recorded_by,recorded_by_name)
      VALUES (o.location_id,p.id,p.name,'salida','venta',_qty,p.avg_cost,_price,_sale_id,'Salida por cambio',auth.uid(),_uname);
  END LOOP;

  UPDATE public.pos_sales SET total_cost = (SELECT coalesce(sum(quantity*unit_cost),0) FROM public.pos_sale_items WHERE sale_id=_sale_id) WHERE id=_sale_id;

  INSERT INTO public.pos_sale_exchanges(location_id,original_sale_id,exchange_sale_id,returned_value,new_value,difference,settlement,credit_amount,notes,recorded_by,recorded_by_name)
  VALUES (o.location_id,o.id,_sale_id,_ret,_new,_diff,_settle,_credit,_payload->>'notes',auth.uid(),_uname);

  RETURN jsonb_build_object('exchange_sale_id',_sale_id,'difference',_diff,'settlement',_settle,'credit',_credit);
END $$;
REVOKE ALL ON FUNCTION public.register_pos_exchange(jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.register_pos_exchange(jsonb) TO authenticated;