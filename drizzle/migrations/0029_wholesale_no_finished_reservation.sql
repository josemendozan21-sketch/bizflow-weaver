CREATE OR REPLACE FUNCTION public.create_order_requirement()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  si public.stock_items%ROWTYPE;
  cname text;
  avail numeric := 0;
  covered numeric;
  req_id uuid;
  is_mayor boolean := COALESCE(NEW.sale_type,'') = 'mayor';
BEGIN
  IF COALESCE(NEW.quantity,0) <= 0 THEN RETURN NEW; END IF;
  cname := public.canonical_reference_name(NEW.product);

  -- Mayoristas siempre se producen desde cuerpos: nunca toman producto terminado.
  SELECT * INTO si FROM public.stock_items
   WHERE brand = NEW.brand
     AND (CASE WHEN is_mayor THEN category = 'cuerpos_referencias'
               ELSE category IN ('producto_terminado','cuerpos_referencias') END)
     AND public.canonical_reference_name(name) = cname
   ORDER BY
     CASE WHEN COALESCE(product_type,'') <> '' AND NEW.product ILIKE '%' || product_type || '%' THEN 0 ELSE 1 END,
     CASE WHEN category = 'producto_terminado' THEN 0 ELSE 1 END,
     available DESC
   LIMIT 1;

  avail := COALESCE(si.available, 0);
  covered := CASE WHEN is_mayor THEN 0 ELSE GREATEST(LEAST(avail, NEW.quantity), 0) END;

  INSERT INTO public.order_requirements (
    order_id, order_code, brand, category, stock_item_id, item_name,
    product_type, color, logo, ref_key,
    quantity_required, quantity_covered, quantity_missing, status
  ) VALUES (
    NEW.id, NEW.order_code, NEW.brand,
    COALESCE(si.category, CASE WHEN is_mayor THEN 'cuerpos_referencias' ELSE 'producto_terminado' END), si.id,
    COALESCE(si.name, NEW.product), si.product_type, si.color, si.logo,
    public.build_ref_key(NEW.brand, COALESCE(si.name, NEW.product), si.product_type, si.color, si.logo),
    NEW.quantity, covered, NEW.quantity - covered, 'pendiente'
  ) RETURNING id INTO req_id;

  IF si.id IS NOT NULL AND covered > 0 THEN
    INSERT INTO public.inventory_movements (
      stock_item_id, item_name, brand, category, quantity, direction, area,
      movement_kind, reason, order_id, recorded_by, recorded_by_name
    ) VALUES (
      si.id, si.name, NEW.brand, si.category, covered, 'entrega', 'asesor_comercial',
      'reserva', 'Reserva automática pedido ' || COALESCE(NEW.order_code,''),
      NEW.id, NEW.advisor_id, COALESCE(NEW.advisor_name, 'Asesor')
    );
    INSERT INTO public.order_reservations (
      order_id, order_code, requirement_id, stock_item_id, item_name, brand, category, quantity, status
    ) VALUES (
      NEW.id, NEW.order_code, req_id, si.id, si.name, NEW.brand, si.category, covered, 'activa'
    );
  END IF;

  IF NOT is_mayor AND NEW.quantity - covered > 0 THEN
    INSERT INTO public.notifications (target_role, title, message, type, reference_id)
    VALUES ('inventarios', 'Faltante de inventario',
      'El pedido ' || COALESCE(NEW.order_code,'') || ' requiere ' || NEW.quantity || ' uds de "' ||
      COALESCE(si.name, NEW.product) || '" y faltan ' || (NEW.quantity - covered) || '.',
      'warning', NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_reservations_on_dispatch()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r record;
BEGIN
  IF NEW.production_status = 'despachado' AND COALESCE(OLD.production_status,'') <> 'despachado' THEN
    FOR r IN SELECT * FROM public.order_reservations WHERE order_id = NEW.id AND status = 'activa' FOR UPDATE LOOP
      UPDATE public.stock_items SET in_process = GREATEST(in_process - r.quantity, 0) WHERE id = r.stock_item_id;
      UPDATE public.order_reservations SET status = 'consumida', consumed_at = now() WHERE id = r.id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_consume_reservations_on_dispatch ON public.orders;
CREATE TRIGGER trg_consume_reservations_on_dispatch AFTER UPDATE OF production_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.consume_reservations_on_dispatch();