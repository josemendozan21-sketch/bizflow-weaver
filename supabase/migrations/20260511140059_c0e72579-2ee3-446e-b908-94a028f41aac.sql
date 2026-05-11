
-- 1) Movement trigger: skip stock change + notification when row is auto-created from a request approval
CREATE OR REPLACE FUNCTION public.process_inventory_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_available numeric;
  target_role_name app_role;
  is_auto boolean := false;
BEGIN
  -- Marker used by request-approval trigger to log the movement without
  -- re-applying stock changes or duplicating notifications.
  IF NEW.reason IS NOT NULL AND NEW.reason LIKE 'AUTO_REQ:%' THEN
    is_auto := true;
  END IF;

  IF NEW.stock_item_id IS NULL THEN
    SELECT id, available INTO NEW.stock_item_id, current_available
      FROM public.stock_items
      WHERE name = NEW.item_name AND brand = NEW.brand AND category = NEW.category
      LIMIT 1;
  ELSE
    SELECT available INTO current_available FROM public.stock_items WHERE id = NEW.stock_item_id;
  END IF;

  IF NEW.stock_item_id IS NULL OR current_available IS NULL THEN
    RAISE EXCEPTION 'Ítem de inventario no encontrado';
  END IF;

  IF is_auto THEN
    -- Strip marker prefix for clean display
    NEW.reason := regexp_replace(NEW.reason, '^AUTO_REQ:\s*', '');
    RETURN NEW;
  END IF;

  IF NEW.direction = 'entrega' THEN
    IF current_available < NEW.quantity THEN
      RAISE EXCEPTION 'Stock insuficiente: disponible %, solicitado %', current_available, NEW.quantity;
    END IF;
    UPDATE public.stock_items SET available = available - NEW.quantity WHERE id = NEW.stock_item_id;

    IF NEW.area = 'feria' THEN
      target_role_name := 'logistica';
    ELSIF NEW.area = 'asesor_comercial' THEN
      target_role_name := 'asesor_comercial';
    ELSE
      target_role_name := NEW.area::app_role;
    END IF;

    INSERT INTO public.notifications (target_role, title, message, type, reference_id)
    VALUES (
      target_role_name,
      'Entrega de inventario',
      'Inventarios entregó ' || NEW.quantity || ' uds de "' || NEW.item_name || '"' ||
      CASE WHEN NEW.area = 'feria' THEN ' para feria.' ELSE '.' END ||
      COALESCE(' Motivo: ' || NEW.reason, ''),
      'info',
      NEW.id
    );
  ELSE
    UPDATE public.stock_items SET available = available + NEW.quantity WHERE id = NEW.stock_item_id;
    INSERT INTO public.notifications (target_role, title, message, type, reference_id)
    VALUES (
      'inventarios',
      'Retorno a inventario',
      'Retorno de ' || NEW.quantity || ' uds de "' || NEW.item_name || '" desde ' || NEW.area ||
      COALESCE('. Motivo: ' || NEW.reason, ''),
      'info',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) Approval trigger: also log an automatic movement to the requester area
CREATE OR REPLACE FUNCTION public.process_inventory_request_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_available numeric;
  movement_area text;
BEGIN
  IF NEW.status = 'aprobada' AND OLD.status <> 'aprobada' THEN
    IF NEW.stock_item_id IS NOT NULL THEN
      SELECT available INTO current_available FROM public.stock_items WHERE id = NEW.stock_item_id;
    ELSE
      SELECT available, id INTO current_available, NEW.stock_item_id
        FROM public.stock_items
        WHERE name = NEW.item_name AND brand = NEW.brand AND category = NEW.category
        LIMIT 1;
    END IF;

    IF current_available IS NULL THEN
      RAISE EXCEPTION 'Ítem de inventario no encontrado';
    END IF;
    IF current_available < NEW.quantity THEN
      RAISE EXCEPTION 'Stock insuficiente: disponible %, solicitado %', current_available, NEW.quantity;
    END IF;

    UPDATE public.stock_items SET available = available - NEW.quantity WHERE id = NEW.stock_item_id;

    IF NEW.category = 'cuerpos_referencias' THEN
      UPDATE public.body_stock SET available = GREATEST(available - NEW.quantity, 0)
       WHERE referencia = NEW.item_name AND brand = NEW.brand;
    END IF;

    NEW.reviewed_at := now();
    IF NEW.reviewed_by IS NULL THEN NEW.reviewed_by := auth.uid(); END IF;

    -- Map requester area to a movements area (movements doesn't include 'inventarios'/'admin')
    movement_area := CASE
      WHEN NEW.requester_area IN ('produccion','estampacion','logistica','asesor_comercial') THEN NEW.requester_area
      ELSE 'logistica'
    END;

    -- Audit entry in inventory_movements (trigger detects AUTO_REQ marker and skips stock + notifications)
    INSERT INTO public.inventory_movements (
      stock_item_id, item_name, brand, category, quantity, direction, area,
      reason, order_id, recorded_by, recorded_by_name
    ) VALUES (
      NEW.stock_item_id, NEW.item_name, NEW.brand, NEW.category, NEW.quantity, 'entrega', movement_area,
      'AUTO_REQ: ' || COALESCE(NEW.reason, 'Solicitud aprobada'),
      NEW.order_id, NEW.reviewed_by, COALESCE(NEW.reviewed_by_name, 'Inventarios')
    );

    INSERT INTO public.notifications (target_user_id, target_role, title, message, type, reference_id)
    VALUES (NEW.requester_id, NEW.requester_area::app_role,
      'Solicitud aprobada',
      'Tu solicitud de ' || NEW.quantity || ' uds de "' || NEW.item_name || '" fue aprobada y entregada.',
      'success', NEW.id);

  ELSIF NEW.status = 'rechazada' AND OLD.status <> 'rechazada' THEN
    NEW.reviewed_at := now();
    IF NEW.reviewed_by IS NULL THEN NEW.reviewed_by := auth.uid(); END IF;
    INSERT INTO public.notifications (target_user_id, target_role, title, message, type, reference_id)
    VALUES (NEW.requester_id, NEW.requester_area::app_role,
      'Solicitud rechazada',
      'Tu solicitud de ' || NEW.quantity || ' uds de "' || NEW.item_name || '" fue rechazada.' || COALESCE(' Motivo: ' || NEW.rejection_reason, ''),
      'warning', NEW.id);

  ELSIF NEW.status = 'en_produccion' AND OLD.status <> 'en_produccion' THEN
    NEW.routed_at := now();
    NEW.routed_to := 'produccion';
    IF NEW.reviewed_by IS NULL THEN NEW.reviewed_by := auth.uid(); END IF;
    INSERT INTO public.notifications (target_role, title, message, type, reference_id)
    VALUES ('produccion', 'Nueva solicitud ruteada',
      'Inventarios envió a producción: ' || NEW.quantity || ' uds de "' || NEW.item_name || '".',
      'info', NEW.id);
    INSERT INTO public.notifications (target_user_id, target_role, title, message, type, reference_id)
    VALUES (NEW.requester_id, NEW.requester_area::app_role, 'Solicitud en producción',
      'Tu solicitud de "' || NEW.item_name || '" fue enviada a producción para reabastecer.',
      'info', NEW.id);

  ELSIF NEW.status = 'en_estampacion' AND OLD.status <> 'en_estampacion' THEN
    NEW.routed_at := now();
    NEW.routed_to := 'estampacion';
    IF NEW.reviewed_by IS NULL THEN NEW.reviewed_by := auth.uid(); END IF;
    INSERT INTO public.notifications (target_role, title, message, type, reference_id)
    VALUES ('estampacion', 'Nueva solicitud ruteada',
      'Inventarios envió a estampación: ' || NEW.quantity || ' uds de "' || NEW.item_name || '".',
      'info', NEW.id);
    INSERT INTO public.notifications (target_user_id, target_role, title, message, type, reference_id)
    VALUES (NEW.requester_id, NEW.requester_area::app_role, 'Solicitud en estampación',
      'Tu solicitud de "' || NEW.item_name || '" fue enviada a estampación.',
      'info', NEW.id);
  END IF;

  RETURN NEW;
END;
$function$;
