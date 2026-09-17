-- 1. Clave de referencia estable en stock_items -------------------------------
CREATE OR REPLACE FUNCTION public.build_stock_ref_key(
  _category text, _brand text, _name text, _type text, _color text, _logo text
) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT lower(btrim(COALESCE(_category,''))) || '|' ||
         public.build_ref_key(_brand, _name, _type, _color, _logo);
$$;

ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS ref_key text;

CREATE OR REPLACE FUNCTION public.set_stock_item_ref_key()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.ref_key := public.build_stock_ref_key(
    NEW.category, NEW.brand, NEW.name, NEW.product_type, NEW.color, NEW.logo
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_stock_item_ref_key ON public.stock_items;
CREATE TRIGGER trg_set_stock_item_ref_key
  BEFORE INSERT OR UPDATE OF category, brand, name, product_type, color, logo
  ON public.stock_items FOR EACH ROW EXECUTE FUNCTION public.set_stock_item_ref_key();

UPDATE public.stock_items SET ref_key = public.build_stock_ref_key(
  category, brand, name, product_type, color, logo
) WHERE ref_key IS DISTINCT FROM public.build_stock_ref_key(category, brand, name, product_type, color, logo);

ALTER TABLE public.stock_items ALTER COLUMN ref_key SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS stock_items_ref_key_uidx ON public.stock_items (ref_key);

-- 2. Punto de venta: origen de cada línea --------------------------------------
ALTER TABLE public.pos_products
  ADD COLUMN IF NOT EXISTS stock_item_id uuid REFERENCES public.stock_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'tienda';

ALTER TABLE public.pos_products DROP CONSTRAINT IF EXISTS pos_products_origin_check;
ALTER TABLE public.pos_products ADD CONSTRAINT pos_products_origin_check
  CHECK (origin IN ('bodega','tienda'));

CREATE INDEX IF NOT EXISTS pos_products_stock_item_idx ON public.pos_products (stock_item_id);

-- 3. Ferias: emparejar por ítem de Bodega (sin cambiar el flujo) ---------------
ALTER TABLE public.feria_inventory
  ADD COLUMN IF NOT EXISTS stock_item_id uuid REFERENCES public.stock_items(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS feria_inventory_stock_item_idx ON public.feria_inventory (stock_item_id);

-- 4. Área punto de venta en movimientos de bodega ------------------------------
ALTER TABLE public.inventory_movements DROP CONSTRAINT IF EXISTS inventory_movements_area_check;
ALTER TABLE public.inventory_movements ADD CONSTRAINT inventory_movements_area_check
  CHECK (area IN ('produccion','estampacion','logistica','asesor_comercial','feria','punto_venta','tienda_web'));

-- 5. Entrada por compra externa solo en líneas 'tienda' ------------------------
CREATE OR REPLACE FUNCTION public.enforce_pos_entry_origin()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE o text;
BEGIN
  IF NEW.direction = 'entrada'
     AND COALESCE(NEW.source,'') NOT IN ('traslado_bodega','ajuste','devolucion')
     AND NEW.pos_product_id IS NOT NULL THEN
    SELECT origin INTO o FROM public.pos_products WHERE id = NEW.pos_product_id;
    IF o = 'bodega' THEN
      RAISE EXCEPTION 'Esta referencia proviene de Bodega: la entrada solo se hace por asignación desde Bodega.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_pos_entry_origin ON public.pos_inventory_movements;
CREATE TRIGGER trg_enforce_pos_entry_origin
  BEFORE INSERT ON public.pos_inventory_movements
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pos_entry_origin();

-- 6. Asignación atómica Bodega -> Punto de venta -------------------------------
CREATE OR REPLACE FUNCTION public.receive_pos_transfer(_transfer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  t record; si record; pp record; pid uuid; uname text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  SELECT * INTO t FROM public.pos_central_transfers WHERE id = _transfer_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Traslado no encontrado'); END IF;
  IF t.status = 'recibido' THEN
    RETURN jsonb_build_object('success', true, 'message', 'El traslado ya fue recibido', 'already', true);
  END IF;
  IF t.status = 'cancelado' THEN
    RETURN jsonb_build_object('success', false, 'message', 'El traslado está cancelado');
  END IF;
  IF t.stock_item_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'El traslado no tiene referencia de Bodega');
  END IF;

  SELECT * INTO si FROM public.stock_items WHERE id = t.stock_item_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Referencia de Bodega no encontrada'); END IF;
  IF COALESCE(si.available,0) < t.quantity THEN
    RETURN jsonb_build_object('success', false, 'message',
      'Bodega no tiene suficientes unidades (' || COALESCE(si.available,0) || ' disponibles de ' || t.quantity || ')');
  END IF;

  SELECT full_name INTO uname FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

  -- línea destino en el punto
  pid := t.pos_product_id;
  IF pid IS NULL THEN
    SELECT * INTO pp FROM public.pos_products
      WHERE location_id = t.location_id AND stock_item_id = si.id LIMIT 1;
    IF FOUND THEN pid := pp.id; END IF;
  END IF;

  IF pid IS NULL THEN
    INSERT INTO public.pos_products (
      location_id, name, brand, category, sale_price, avg_cost, available, unit,
      active, stock_item_id, origin, notes
    ) VALUES (
      t.location_id, COALESCE(t.item_name, si.name), COALESCE(t.brand, si.brand), si.category,
      0, COALESCE(t.unit_cost, 0), 0, COALESCE(si.unit, 'Unidades'),
      true, si.id, 'bodega', 'Creado por asignación desde Bodega'
    ) RETURNING id INTO pid;
  ELSE
    UPDATE public.pos_products
      SET stock_item_id = si.id, origin = 'bodega'
      WHERE id = pid AND (stock_item_id IS DISTINCT FROM si.id OR origin <> 'bodega');
  END IF;

  -- salida de Bodega (el trigger process_inventory_movement descuenta stock_items)
  INSERT INTO public.inventory_movements (
    stock_item_id, item_name, brand, category, quantity, direction, area,
    movement_kind, reason, recorded_by, recorded_by_name, purpose
  ) VALUES (
    si.id, si.name, si.brand, si.category, t.quantity, 'entrega', 'punto_venta',
    'salida', 'Asignación a punto de venta', auth.uid(), uname, 'Traslado ' || _transfer_id::text
  );

  -- entrada en el punto
  UPDATE public.pos_products SET available = COALESCE(available,0) + t.quantity WHERE id = pid;

  INSERT INTO public.pos_inventory_movements (
    location_id, pos_product_id, product_name, direction, source, quantity,
    unit_cost, reference_id, notes, recorded_by, recorded_by_name
  ) VALUES (
    t.location_id, pid, COALESCE(t.item_name, si.name), 'entrada', 'traslado_bodega', t.quantity,
    COALESCE(t.unit_cost, 0), _transfer_id, 'Asignación desde Bodega', auth.uid(), uname
  );

  UPDATE public.pos_central_transfers
    SET status = 'recibido', pos_product_id = pid, received_by = auth.uid(),
        received_at = now(), updated_at = now()
    WHERE id = _transfer_id;

  RETURN jsonb_build_object('success', true, 'pos_product_id', pid, 'quantity', t.quantity);
END;
$$;

GRANT EXECUTE ON FUNCTION public.receive_pos_transfer(uuid) TO authenticated;

-- 7. Reservas de la tienda web -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.web_stock_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text NOT NULL UNIQUE,
  ref_key text NOT NULL,
  stock_item_id uuid REFERENCES public.stock_items(id) ON DELETE SET NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'reservada' CHECK (status IN ('reservada','confirmada','liberada','expirada')),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 minutes',
  confirmed_at timestamptz,
  released_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.web_stock_reservations TO authenticated;
GRANT ALL ON public.web_stock_reservations TO service_role;
ALTER TABLE public.web_stock_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff ve reservas web" ON public.web_stock_reservations;
CREATE POLICY "Staff ve reservas web" ON public.web_stock_reservations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'inventarios') OR public.has_role(auth.uid(),'contabilidad'));

CREATE INDEX IF NOT EXISTS web_stock_reservations_status_idx ON public.web_stock_reservations (status, expires_at);

CREATE OR REPLACE FUNCTION public.expire_web_reservations()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r record; n integer := 0;
BEGIN
  FOR r IN
    SELECT * FROM public.web_stock_reservations
      WHERE status = 'reservada' AND expires_at < now()
      FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.stock_items
      SET in_process = GREATEST(COALESCE(in_process,0) - r.quantity, 0),
          available = COALESCE(available,0) + r.quantity
      WHERE id = r.stock_item_id;
    UPDATE public.web_stock_reservations
      SET status = 'expirada', released_at = now(), updated_at = now() WHERE id = r.id;
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.web_reserve_stock(_external_id text, _ref_key text, _quantity numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE ex record; si record;
BEGIN
  IF _external_id IS NULL OR btrim(_external_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'external_id requerido');
  END IF;
  IF _quantity IS NULL OR _quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cantidad inválida');
  END IF;

  PERFORM public.expire_web_reservations();

  SELECT * INTO ex FROM public.web_stock_reservations WHERE external_id = _external_id;
  IF FOUND THEN
    RETURN jsonb_build_object('success', ex.status IN ('reservada','confirmada'),
      'reservation_id', ex.id, 'status', ex.status, 'idempotent', true);
  END IF;

  SELECT * INTO si FROM public.stock_items WHERE ref_key = _ref_key FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Referencia no encontrada', 'ref_key', _ref_key);
  END IF;
  IF COALESCE(si.available,0) < _quantity THEN
    RETURN jsonb_build_object('success', false, 'message', 'Stock insuficiente',
      'available', COALESCE(si.available,0));
  END IF;

  UPDATE public.stock_items
    SET available = COALESCE(available,0) - _quantity,
        in_process = COALESCE(in_process,0) + _quantity
    WHERE id = si.id;

  INSERT INTO public.web_stock_reservations (external_id, ref_key, stock_item_id, quantity)
  VALUES (_external_id, _ref_key, si.id, _quantity)
  RETURNING * INTO ex;

  RETURN jsonb_build_object('success', true, 'reservation_id', ex.id, 'status', ex.status,
    'expires_at', ex.expires_at, 'available', COALESCE(si.available,0) - _quantity);
END;
$$;

CREATE OR REPLACE FUNCTION public.web_confirm_reservation(_external_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r record; si record;
BEGIN
  SELECT * INTO r FROM public.web_stock_reservations WHERE external_id = _external_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Reserva no encontrada'); END IF;
  IF r.status = 'confirmada' THEN
    RETURN jsonb_build_object('success', true, 'status', r.status, 'idempotent', true);
  END IF;
  IF r.status <> 'reservada' THEN
    RETURN jsonb_build_object('success', false, 'message', 'La reserva está ' || r.status);
  END IF;

  UPDATE public.stock_items
    SET in_process = GREATEST(COALESCE(in_process,0) - r.quantity, 0)
    WHERE id = r.stock_item_id RETURNING * INTO si;

  INSERT INTO public.inventory_movements (
    stock_item_id, item_name, brand, category, quantity, direction, area,
    movement_kind, reason, purpose
  )
  SELECT si.id, si.name, si.brand, si.category, r.quantity, 'entrega', 'tienda_web',
         'ajuste', 'Venta tienda web confirmada', 'Reserva ' || r.external_id
  WHERE si.id IS NOT NULL;

  UPDATE public.web_stock_reservations
    SET status = 'confirmada', confirmed_at = now(), updated_at = now() WHERE id = r.id;

  RETURN jsonb_build_object('success', true, 'status', 'confirmada', 'reservation_id', r.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.web_release_reservation(_external_id text, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.web_stock_reservations WHERE external_id = _external_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Reserva no encontrada'); END IF;
  IF r.status IN ('liberada','expirada') THEN
    RETURN jsonb_build_object('success', true, 'status', r.status, 'idempotent', true);
  END IF;
  IF r.status = 'confirmada' THEN
    RETURN jsonb_build_object('success', false, 'message', 'La reserva ya fue confirmada');
  END IF;

  UPDATE public.stock_items
    SET in_process = GREATEST(COALESCE(in_process,0) - r.quantity, 0),
        available = COALESCE(available,0) + r.quantity
    WHERE id = r.stock_item_id;

  UPDATE public.web_stock_reservations
    SET status = 'liberada', released_at = now(), notes = COALESCE(_reason, notes), updated_at = now()
    WHERE id = r.id;

  RETURN jsonb_build_object('success', true, 'status', 'liberada', 'reservation_id', r.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.web_check_availability(_ref_keys text[])
RETURNS TABLE(ref_key text, name text, brand text, category text, available numeric, in_process numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT s.ref_key, s.name, s.brand, s.category,
         COALESCE(s.available,0)::numeric, COALESCE(s.in_process,0)::numeric
  FROM public.stock_items s
  WHERE _ref_keys IS NULL OR s.ref_key = ANY(_ref_keys);
$$;

REVOKE ALL ON FUNCTION public.web_reserve_stock(text, text, numeric) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.web_confirm_reservation(text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.web_release_reservation(text, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_web_reservations() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.web_check_availability(text[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.web_reserve_stock(text, text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.web_confirm_reservation(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.web_release_reservation(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_web_reservations() TO service_role;
GRANT EXECUTE ON FUNCTION public.web_check_availability(text[]) TO service_role, authenticated;

-- 8. Vista de control por referencia -------------------------------------------
CREATE OR REPLACE VIEW public.inventory_control_view
WITH (security_invoker = true) AS
SELECT
  s.id AS stock_item_id,
  s.ref_key,
  s.name,
  s.brand,
  s.category,
  s.product_type,
  COALESCE(s.available,0)::numeric AS disponible_bodega,
  COALESCE(s.in_process,0)::numeric AS en_proceso,
  COALESCE((SELECT SUM(p.available) FROM public.pos_products p
            WHERE p.stock_item_id = s.id AND p.origin = 'bodega' AND p.active), 0)::numeric AS asignado_punto92,
  COALESCE((SELECT SUM(GREATEST(COALESCE(f.quantity_dispatched, f.quantity_assigned),0) - COALESCE(f.quantity_returned,0))
            FROM public.feria_inventory f WHERE f.stock_item_id = s.id), 0)::numeric AS asignado_ferias,
  (COALESCE(s.available,0)
   + COALESCE(s.in_process,0)
   + COALESCE((SELECT SUM(p.available) FROM public.pos_products p
               WHERE p.stock_item_id = s.id AND p.origin = 'bodega' AND p.active), 0)
   + COALESCE((SELECT SUM(GREATEST(COALESCE(f.quantity_dispatched, f.quantity_assigned),0) - COALESCE(f.quantity_returned,0))
               FROM public.feria_inventory f WHERE f.stock_item_id = s.id), 0))::numeric AS total_controlado
FROM public.stock_items s;

GRANT SELECT ON public.inventory_control_view TO authenticated, service_role;

-- 9. Realtime -------------------------------------------------------------------
ALTER TABLE public.pos_products REPLICA IDENTITY FULL;
ALTER TABLE public.pos_central_transfers REPLICA IDENTITY FULL;
ALTER TABLE public.pos_inventory_movements REPLICA IDENTITY FULL;
ALTER TABLE public.inventory_movements REPLICA IDENTITY FULL;
ALTER TABLE public.feria_inventory REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_products; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_central_transfers; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_inventory_movements; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_movements; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.feria_inventory; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;