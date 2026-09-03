CREATE TABLE public.order_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  order_code text,
  requirement_id uuid,
  stock_item_id uuid,
  item_name text NOT NULL,
  brand text NOT NULL,
  category text NOT NULL DEFAULT 'producto_terminado',
  quantity numeric NOT NULL CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'activa',
  released_by uuid,
  released_by_name text,
  released_at timestamptz,
  release_reason text,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.order_reservations TO authenticated;
GRANT ALL ON public.order_reservations TO service_role;

ALTER TABLE public.order_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view reservations"
  ON public.order_reservations FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_order_reservations_order ON public.order_reservations(order_id);
CREATE INDEX idx_order_reservations_status ON public.order_reservations(status);
CREATE INDEX idx_order_reservations_item ON public.order_reservations(stock_item_id);

CREATE TRIGGER trg_order_reservations_updated_at
BEFORE UPDATE ON public.order_reservations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 1) Reserva automática al crear el pedido (extiende create_order_requirement)
CREATE OR REPLACE FUNCTION public.create_order_requirement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  si public.stock_items%ROWTYPE;
  cname text;
  avail numeric := 0;
  covered numeric;
  req_id uuid;
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
  IF covered < 0 THEN covered := 0; END IF;

  INSERT INTO public.order_requirements (
    order_id, order_code, brand, category, stock_item_id, item_name,
    product_type, color, logo, ref_key,
    quantity_required, quantity_covered, quantity_missing, status
  ) VALUES (
    NEW.id, NEW.order_code, NEW.brand, COALESCE(si.category,'producto_terminado'), si.id,
    COALESCE(si.name, NEW.product), si.product_type, si.color, si.logo,
    public.build_ref_key(NEW.brand, COALESCE(si.name, NEW.product), si.product_type, si.color, si.logo),
    NEW.quantity, covered, NEW.quantity - covered, 'pendiente'
  ) RETURNING id INTO req_id;

  -- Reserva automática: mueve available -> in_process para lo que alcance
  IF si.id IS NOT NULL AND covered > 0 THEN
    INSERT INTO public.inventory_movements (
      stock_item_id, item_name, brand, category, quantity, direction, area,
      movement_kind, reason, order_id, recorded_by, recorded_by_name
    ) VALUES (
      si.id, si.name, NEW.brand, si.category, covered, 'entrega', 'asesor_comercial',
      'reserva',
      'Reserva automática pedido ' || COALESCE(NEW.order_code,''),
      NEW.id, NEW.advisor_id, COALESCE(NEW.advisor_name, 'Asesor')
    );

    INSERT INTO public.order_reservations (
      order_id, order_code, requirement_id, stock_item_id, item_name, brand, category, quantity, status
    ) VALUES (
      NEW.id, NEW.order_code, req_id, si.id, si.name, NEW.brand, si.category, covered, 'activa'
    );
  END IF;

  IF NEW.quantity - covered > 0 THEN
    INSERT INTO public.notifications (target_role, title, message, type, reference_id)
    VALUES ('inventarios', 'Faltante de inventario',
      'El pedido ' || COALESCE(NEW.order_code,'') || ' requiere ' || NEW.quantity || ' uds de "' ||
      COALESCE(si.name, NEW.product) || '" y faltan ' || (NEW.quantity - covered) || '.',
      'warning', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Confirmación de inventarios: consume la reserva en vez de descontar dos veces
CREATE OR REPLACE FUNCTION public.confirm_order_requirement(_requirement_id uuid, _confirm_quantity numeric DEFAULT NULL::numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.order_requirements%ROWTYPE;
  avail numeric := 0;
  reserved numeric := 0;
  usable numeric := 0;
  take numeric := 0;
  from_reserve numeric := 0;
  from_avail numeric := 0;
  missing numeric := 0;
  b public.production_batches%ROWTYPE;
  uname text;
  ord public.orders%ROWTYPE;
  res record;
  remaining numeric;
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

  SELECT COALESCE(SUM(quantity),0) INTO reserved
    FROM public.order_reservations
   WHERE order_id = r.order_id
     AND status = 'activa'
     AND (stock_item_id IS NOT DISTINCT FROM r.stock_item_id);

  usable := avail + reserved;
  take := LEAST(COALESCE(_confirm_quantity, usable), usable, r.quantity_required);
  IF take < 0 THEN take := 0; END IF;
  missing := r.quantity_required - take;

  from_reserve := LEAST(take, reserved);
  from_avail := take - from_reserve;

  -- Consume reservas activas (baja in_process, no toca available)
  remaining := from_reserve;
  FOR res IN
    SELECT * FROM public.order_reservations
     WHERE order_id = r.order_id
       AND status = 'activa'
       AND (stock_item_id IS NOT DISTINCT FROM r.stock_item_id)
     ORDER BY created_at
     FOR UPDATE
  LOOP
    EXIT WHEN remaining <= 0;
    IF res.quantity <= remaining THEN
      UPDATE public.stock_items
         SET in_process = GREATEST(in_process - res.quantity, 0)
       WHERE id = res.stock_item_id;
      UPDATE public.order_reservations
         SET status = 'consumida', consumed_at = now()
       WHERE id = res.id;
      remaining := remaining - res.quantity;
    ELSE
      UPDATE public.stock_items
         SET in_process = GREATEST(in_process - remaining, 0)
       WHERE id = res.stock_item_id;
      UPDATE public.order_reservations
         SET quantity = res.quantity - remaining
       WHERE id = res.id;
      INSERT INTO public.order_reservations (
        order_id, order_code, requirement_id, stock_item_id, item_name, brand, category,
        quantity, status, consumed_at
      ) VALUES (
        res.order_id, res.order_code, res.requirement_id, res.stock_item_id, res.item_name,
        res.brand, res.category, remaining, 'consumida', now()
      );
      remaining := 0;
    END IF;
  END LOOP;

  IF take > 0 THEN
    INSERT INTO public.inventory_movements (
      stock_item_id, item_name, brand, category, quantity, direction, area,
      movement_kind, reason, order_id, recorded_by, recorded_by_name
    ) VALUES (
      r.stock_item_id, r.item_name, r.brand, r.category, take, 'entrega', 'logistica',
      CASE WHEN from_avail > 0 THEN 'salida' ELSE NULL END,
      CASE WHEN from_avail > 0
        THEN 'AUTO_RESERVA:' || from_reserve || '|Abastecimiento pedido ' || COALESCE(r.order_code,'')
        ELSE 'AUTO_REQ: Entrega desde reserva pedido ' || COALESCE(r.order_code,'')
      END,
      r.order_id, auth.uid(), uname
    );

    -- Si parte vino del disponible y parte de reserva, ajusta el descuento
    IF from_avail > 0 AND from_reserve > 0 THEN
      UPDATE public.stock_items
         SET available = available + from_reserve
       WHERE id = r.stock_item_id;
    END IF;
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

  RETURN jsonb_build_object('ok', true, 'covered', take, 'from_reserve', from_reserve, 'missing', missing);
END;
$$;

-- 3) Liberación automática al cancelar el pedido
CREATE OR REPLACE FUNCTION public.release_reservations_on_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res record;
BEGIN
  IF COALESCE(NEW.production_status,'') NOT IN ('cancelado','cancelada') THEN
    RETURN NEW;
  END IF;
  IF COALESCE(OLD.production_status,'') IN ('cancelado','cancelada') THEN
    RETURN NEW;
  END IF;

  FOR res IN
    SELECT * FROM public.order_reservations WHERE order_id = NEW.id AND status = 'activa'
  LOOP
    INSERT INTO public.inventory_movements (
      stock_item_id, item_name, brand, category, quantity, direction, area,
      movement_kind, reason, order_id, recorded_by_name
    ) VALUES (
      res.stock_item_id, res.item_name, res.brand, res.category, res.quantity, 'retorno', 'inventarios',
      'liberar_reserva', 'Liberación por cancelación del pedido ' || COALESCE(res.order_code,''),
      res.order_id, 'Sistema'
    );

    UPDATE public.order_reservations
       SET status = 'liberada',
           released_at = now(),
           released_by_name = 'Sistema (cancelación)',
           release_reason = 'Pedido cancelado'
     WHERE id = res.id;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_release_reservations_on_cancel ON public.orders;
CREATE TRIGGER trg_release_reservations_on_cancel
AFTER UPDATE OF production_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.release_reservations_on_cancel();

-- 4) Liberación manual (admin / inventarios)
CREATE OR REPLACE FUNCTION public.release_order_reservation(_reservation_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    res.stock_item_id, res.item_name, res.brand, res.category, res.quantity, 'retorno', 'inventarios',
    'liberar_reserva', 'Liberación manual: ' || _reason, res.order_id, auth.uid(), uname
  );

  UPDATE public.order_reservations
     SET status = 'liberada',
         released_at = now(),
         released_by = auth.uid(),
         released_by_name = uname,
         release_reason = _reason
   WHERE id = res.id;

  IF ord.advisor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (ord.advisor_id, 'Reserva de inventario liberada',
      'Se liberaron ' || res.quantity || ' uds de "' || res.item_name || '" del pedido ' ||
      COALESCE(res.order_code,'') || '. Motivo: ' || _reason,
      'warning', res.order_id);
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.release_order_reservation(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_order_reservation(uuid, text) TO authenticated;