-- ============ TABLES ============
CREATE TABLE public.order_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_code text,
  brand text NOT NULL,
  category text NOT NULL DEFAULT 'producto_terminado',
  stock_item_id uuid,
  item_name text NOT NULL,
  product_type text,
  color text,
  logo text,
  ref_key text NOT NULL,
  quantity_required numeric NOT NULL DEFAULT 0,
  quantity_covered numeric NOT NULL DEFAULT 0,
  quantity_missing numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendiente',
  confirmed_by uuid,
  confirmed_by_name text,
  confirmed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_requirements TO authenticated;
GRANT ALL ON public.order_requirements TO service_role;
ALTER TABLE public.order_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "req_select_auth" ON public.order_requirements
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "req_write_inv_admin" ON public.order_requirements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'inventarios'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'inventarios'));

CREATE TABLE public.production_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number bigserial,
  ref_key text NOT NULL,
  brand text NOT NULL,
  category text NOT NULL DEFAULT 'producto_terminado',
  stock_item_id uuid,
  item_name text NOT NULL,
  product_type text,
  color text,
  logo text,
  target_quantity numeric NOT NULL DEFAULT 0,
  produced_quantity numeric,
  received_quantity numeric,
  status text NOT NULL DEFAULT 'abierto',
  started_at timestamptz,
  started_by uuid,
  started_by_name text,
  finished_at timestamptz,
  finished_by uuid,
  finished_by_name text,
  received_at timestamptz,
  received_by uuid,
  received_by_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_batches TO authenticated;
GRANT ALL ON public.production_batches TO service_role;
ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "batch_select_auth" ON public.production_batches
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "batch_write_roles" ON public.production_batches
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'inventarios') OR public.has_role(auth.uid(),'produccion'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'inventarios') OR public.has_role(auth.uid(),'produccion'));

CREATE UNIQUE INDEX uniq_open_batch_per_ref ON public.production_batches (ref_key) WHERE status = 'abierto';
CREATE INDEX idx_batches_status ON public.production_batches (status, created_at DESC);

CREATE TABLE public.production_batch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.production_batches(id) ON DELETE CASCADE,
  requirement_id uuid REFERENCES public.order_requirements(id) ON DELETE SET NULL,
  order_id uuid,
  order_code text,
  client_name text,
  quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_batch_items TO authenticated;
GRANT ALL ON public.production_batch_items TO service_role;
ALTER TABLE public.production_batch_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "batch_items_select_auth" ON public.production_batch_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "batch_items_write_roles" ON public.production_batch_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'inventarios') OR public.has_role(auth.uid(),'produccion'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'inventarios') OR public.has_role(auth.uid(),'produccion'));

CREATE INDEX idx_batch_items_batch ON public.production_batch_items (batch_id);
CREATE INDEX idx_req_status ON public.order_requirements (status, created_at DESC);
CREATE INDEX idx_req_order ON public.order_requirements (order_id);

CREATE TRIGGER trg_order_requirements_updated_at BEFORE UPDATE ON public.order_requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_production_batches_updated_at BEFORE UPDATE ON public.production_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.canonical_reference_name(_name text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT lower(btrim(regexp_replace(COALESCE(_name,''), '\s*\((Frío|Frio|Térmico|Termico|Calor)\)\s*$', '', 'i')));
$$;

CREATE OR REPLACE FUNCTION public.build_ref_key(_brand text, _name text, _type text, _color text, _logo text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT lower(COALESCE(_brand,'')) || '|' || public.canonical_reference_name(_name) || '|' ||
         CASE
           WHEN COALESCE(_type,'') ILIKE 'fr%' THEN 'frio'
           WHEN COALESCE(_type,'') ILIKE 'te%' OR COALESCE(_type,'') ILIKE 'té%' OR COALESCE(_type,'') ILIKE 'calor' THEN 'termico'
           ELSE lower(btrim(COALESCE(_type,'')))
         END || '|' || lower(btrim(COALESCE(_color,''))) || '|' ||
         CASE WHEN COALESCE(btrim(_logo),'') = '' THEN 'sin_logo' ELSE 'con_logo' END;
$$;

-- ============ AUTO REQUIREMENT ON NEW ORDER ============
CREATE OR REPLACE FUNCTION public.create_order_requirement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  si public.stock_items%ROWTYPE;
  cname text;
  avail numeric := 0;
  covered numeric;
BEGIN
  IF COALESCE(NEW.quantity,0) <= 0 THEN RETURN NEW; END IF;

  cname := public.canonical_reference_name(NEW.product);

  SELECT * INTO si FROM public.stock_items
   WHERE brand = NEW.brand
     AND category IN ('producto_terminado','cuerpos_referencias')
     AND public.canonical_reference_name(name) = cname
   ORDER BY
     CASE WHEN COALESCE(product_type,'') <> '' AND NEW.product ILIKE '%' || product_type || '%' THEN 0 ELSE 1 END,
     CASE WHEN category = 'producto_terminado' THEN 0 ELSE 1 END,
     available DESC
   LIMIT 1;

  avail := COALESCE(si.available, 0);
  covered := LEAST(avail, NEW.quantity);

  INSERT INTO public.order_requirements (
    order_id, order_code, brand, category, stock_item_id, item_name,
    product_type, color, logo, ref_key,
    quantity_required, quantity_covered, quantity_missing, status
  ) VALUES (
    NEW.id, NEW.order_code, NEW.brand, COALESCE(si.category,'producto_terminado'), si.id,
    COALESCE(si.name, NEW.product), si.product_type, si.color, si.logo,
    public.build_ref_key(NEW.brand, COALESCE(si.name, NEW.product), si.product_type, si.color, si.logo),
    NEW.quantity, covered, NEW.quantity - covered, 'pendiente'
  );

  IF NEW.quantity - covered > 0 THEN
    INSERT INTO public.notifications (target_role, title, message, type, reference_id)
    VALUES ('inventarios', 'Faltante de inventario',
      'El pedido ' || COALESCE(NEW.order_code,'') || ' requiere ' || NEW.quantity || ' uds de "' ||
      COALESCE(si.name, NEW.product) || '" y faltan ' || (NEW.quantity - covered) || '.',
      'warning', NEW.id);
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_create_order_requirement
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.create_order_requirement();

-- ============ CONFIRM REQUIREMENT (INVENTORY) ============
CREATE OR REPLACE FUNCTION public.confirm_order_requirement(_requirement_id uuid, _confirm_quantity numeric DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.order_requirements%ROWTYPE;
  avail numeric := 0;
  take numeric := 0;
  missing numeric := 0;
  b public.production_batches%ROWTYPE;
  uname text;
  ord public.orders%ROWTYPE;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'inventarios')) THEN
    RAISE EXCEPTION 'Solo inventarios o administración pueden confirmar';
  END IF;

  SELECT * INTO r FROM public.order_requirements WHERE id = _requirement_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Requerimiento no encontrado'; END IF;
  IF r.status <> 'pendiente' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Este requerimiento ya fue procesado');
  END IF;

  SELECT COALESCE(email, 'Inventarios') INTO uname FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  SELECT * INTO ord FROM public.orders WHERE id = r.order_id;

  IF r.stock_item_id IS NOT NULL THEN
    SELECT available INTO avail FROM public.stock_items WHERE id = r.stock_item_id;
  END IF;
  avail := COALESCE(avail, 0);

  take := LEAST(COALESCE(_confirm_quantity, avail), avail, r.quantity_required);
  IF take < 0 THEN take := 0; END IF;
  missing := r.quantity_required - take;

  IF take > 0 THEN
    INSERT INTO public.inventory_movements (
      stock_item_id, item_name, brand, category, quantity, direction, area,
      reason, order_id, recorded_by, recorded_by_name
    ) VALUES (
      r.stock_item_id, r.item_name, r.brand, r.category, take, 'entrega', 'logistica',
      'Abastecimiento pedido ' || COALESCE(r.order_code,''), r.order_id, auth.uid(), uname
    );
  END IF;

  UPDATE public.order_requirements
     SET quantity_covered = take,
         quantity_missing = missing,
         status = 'confirmado',
         confirmed_by = auth.uid(),
         confirmed_by_name = uname,
         confirmed_at = now()
   WHERE id = r.id;

  IF missing > 0 THEN
    SELECT * INTO b FROM public.production_batches
     WHERE ref_key = r.ref_key AND status = 'abierto' FOR UPDATE;

    IF b.id IS NULL THEN
      INSERT INTO public.production_batches (
        ref_key, brand, category, stock_item_id, item_name, product_type, color, logo,
        target_quantity, status
      ) VALUES (
        r.ref_key, r.brand, r.category, r.stock_item_id, r.item_name, r.product_type, r.color, r.logo,
        missing, 'abierto'
      ) RETURNING * INTO b;
    ELSE
      UPDATE public.production_batches
         SET target_quantity = target_quantity + missing
       WHERE id = b.id;
    END IF;

    INSERT INTO public.production_batch_items (batch_id, requirement_id, order_id, order_code, client_name, quantity)
    VALUES (b.id, r.id, r.order_id, r.order_code, ord.client_name, missing);

    INSERT INTO public.notifications (target_role, title, message, type, reference_id)
    VALUES ('produccion', 'Nuevo faltante en lote de producción',
      'Se agregaron ' || missing || ' uds de "' || r.item_name || '" al lote abierto.',
      'info', b.id);
  END IF;

  RETURN jsonb_build_object('ok', true, 'covered', take, 'missing', missing);
END; $$;

GRANT EXECUTE ON FUNCTION public.confirm_order_requirement(uuid, numeric) TO authenticated;

-- ============ START / FINISH BATCH (PRODUCTION) ============
CREATE OR REPLACE FUNCTION public.start_production_batch(_batch_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uname text; b public.production_batches%ROWTYPE;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'produccion') OR public.has_role(auth.uid(),'inventarios')) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  SELECT COALESCE(email,'Producción') INTO uname FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  SELECT * INTO b FROM public.production_batches WHERE id = _batch_id FOR UPDATE;
  IF b.id IS NULL THEN RAISE EXCEPTION 'Lote no encontrado'; END IF;
  IF b.status <> 'abierto' THEN RETURN jsonb_build_object('ok', false, 'message','El lote ya fue iniciado'); END IF;

  UPDATE public.production_batches
     SET status = 'en_proceso', started_at = now(), started_by = auth.uid(), started_by_name = uname
   WHERE id = _batch_id;

  INSERT INTO public.notifications (target_role, title, message, type, reference_id)
  VALUES ('inventarios', 'Producción iniciada',
    'Producción inició el lote #' || b.batch_number || ' de "' || b.item_name || '" (' || b.target_quantity || ' uds).',
    'info', _batch_id);

  RETURN jsonb_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.start_production_batch(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.finish_production_batch(_batch_id uuid, _produced numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uname text; b public.production_batches%ROWTYPE;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'produccion')) THEN
    RAISE EXCEPTION 'Solo producción puede finalizar el lote';
  END IF;
  IF COALESCE(_produced,0) < 0 THEN RAISE EXCEPTION 'Cantidad inválida'; END IF;
  SELECT COALESCE(email,'Producción') INTO uname FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  SELECT * INTO b FROM public.production_batches WHERE id = _batch_id FOR UPDATE;
  IF b.id IS NULL THEN RAISE EXCEPTION 'Lote no encontrado'; END IF;
  IF b.status <> 'en_proceso' THEN RETURN jsonb_build_object('ok', false, 'message','El lote no está en proceso'); END IF;

  UPDATE public.production_batches
     SET status = 'finalizado', produced_quantity = _produced,
         finished_at = now(), finished_by = auth.uid(), finished_by_name = uname
   WHERE id = _batch_id;

  INSERT INTO public.notifications (target_role, title, message, type, reference_id)
  VALUES ('inventarios', 'Lote listo para recepción',
    'Producción finalizó el lote #' || b.batch_number || ' de "' || b.item_name || '" con ' || _produced || ' uds. Confirma la recepción.',
    'warning', _batch_id);

  RETURN jsonb_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.finish_production_batch(uuid, numeric) TO authenticated;

-- ============ RECEIVE BATCH (INVENTORY, DOUBLE CHECK) ============
CREATE OR REPLACE FUNCTION public.receive_production_batch(_batch_id uuid, _received numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uname text; b public.production_batches%ROWTYPE;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'inventarios')) THEN
    RAISE EXCEPTION 'Solo inventarios puede confirmar la recepción';
  END IF;
  IF COALESCE(_received,0) < 0 THEN RAISE EXCEPTION 'Cantidad inválida'; END IF;
  SELECT COALESCE(email,'Inventarios') INTO uname FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

  SELECT * INTO b FROM public.production_batches WHERE id = _batch_id FOR UPDATE;
  IF b.id IS NULL THEN RAISE EXCEPTION 'Lote no encontrado'; END IF;
  IF b.status = 'recibido' THEN
    RETURN jsonb_build_object('ok', false, 'message','Este lote ya fue recibido');
  END IF;
  IF b.status <> 'finalizado' THEN
    RETURN jsonb_build_object('ok', false, 'message','El lote aún no ha sido finalizado por producción');
  END IF;

  UPDATE public.production_batches
     SET status = 'recibido', received_quantity = _received,
         received_at = now(), received_by = auth.uid(), received_by_name = uname
   WHERE id = _batch_id AND status = 'finalizado';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message','El lote ya fue recibido');
  END IF;

  IF _received > 0 AND b.stock_item_id IS NOT NULL THEN
    INSERT INTO public.inventory_movements (
      stock_item_id, item_name, brand, category, quantity, direction, area,
      reason, recorded_by, recorded_by_name
    ) VALUES (
      b.stock_item_id, b.item_name, b.brand, b.category, _received, 'retorno', 'produccion',
      'Recepción lote de producción #' || b.batch_number, auth.uid(), uname
    );
  END IF;

  RETURN jsonb_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.receive_production_batch(uuid, numeric) TO authenticated;