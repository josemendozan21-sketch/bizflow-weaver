
ALTER TABLE public.stock_items
  ADD COLUMN IF NOT EXISTS in_process numeric NOT NULL DEFAULT 0;

ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS requested_by_name text,
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS movement_kind text NOT NULL DEFAULT 'salida';

-- Backfill movement_kind from existing direction values
UPDATE public.inventory_movements
   SET movement_kind = CASE WHEN direction = 'retorno' THEN 'entrada' ELSE 'salida' END
 WHERE movement_kind IS NULL OR movement_kind = 'salida';

CREATE OR REPLACE FUNCTION public.process_inventory_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_available numeric;
  current_in_process numeric;
  target_role_name app_role;
  is_auto boolean := false;
  kind text;
BEGIN
  IF NEW.reason IS NOT NULL AND NEW.reason LIKE 'AUTO_REQ:%' THEN
    is_auto := true;
  END IF;

  IF NEW.stock_item_id IS NULL THEN
    SELECT id, available, in_process INTO NEW.stock_item_id, current_available, current_in_process
      FROM public.stock_items
      WHERE name = NEW.item_name AND brand = NEW.brand AND category = NEW.category
      LIMIT 1;
  ELSE
    SELECT available, in_process INTO current_available, current_in_process
      FROM public.stock_items WHERE id = NEW.stock_item_id;
  END IF;

  IF NEW.stock_item_id IS NULL OR current_available IS NULL THEN
    RAISE EXCEPTION 'Ítem de inventario no encontrado';
  END IF;

  IF is_auto THEN
    NEW.reason := regexp_replace(NEW.reason, '^AUTO_REQ:\s*', '');
    RETURN NEW;
  END IF;

  kind := COALESCE(NEW.movement_kind, CASE WHEN NEW.direction = 'retorno' THEN 'entrada' ELSE 'salida' END);

  IF kind = 'entrada' THEN
    UPDATE public.stock_items SET available = available + NEW.quantity WHERE id = NEW.stock_item_id;
    INSERT INTO public.notifications (target_role, title, message, type, reference_id)
    VALUES ('inventarios', 'Entrada de inventario',
      'Entrada de ' || NEW.quantity || ' uds de "' || NEW.item_name || '"' ||
      COALESCE(' — ' || NEW.purpose, '') ||
      COALESCE(' (solicita: ' || NEW.requested_by_name || ')', ''),
      'info', NEW.id);

  ELSIF kind = 'salida' THEN
    IF current_available < NEW.quantity THEN
      RAISE EXCEPTION 'Stock insuficiente: disponible %, solicitado %', current_available, NEW.quantity;
    END IF;
    UPDATE public.stock_items SET available = available - NEW.quantity WHERE id = NEW.stock_item_id;

    IF NEW.area = 'feria' THEN target_role_name := 'logistica';
    ELSIF NEW.area = 'asesor_comercial' THEN target_role_name := 'asesor_comercial';
    ELSE target_role_name := NEW.area::app_role;
    END IF;

    INSERT INTO public.notifications (target_role, title, message, type, reference_id)
    VALUES (target_role_name, 'Salida de inventario',
      'Salida de ' || NEW.quantity || ' uds de "' || NEW.item_name || '"' ||
      COALESCE(' para ' || NEW.purpose, '') ||
      COALESCE(' (solicita: ' || NEW.requested_by_name || ')', ''),
      'info', NEW.id);

  ELSIF kind = 'reserva' THEN
    IF current_available < NEW.quantity THEN
      RAISE EXCEPTION 'Stock insuficiente para reservar: disponible %, solicitado %', current_available, NEW.quantity;
    END IF;
    UPDATE public.stock_items
       SET available = available - NEW.quantity,
           in_process = in_process + NEW.quantity
     WHERE id = NEW.stock_item_id;

  ELSIF kind = 'liberar_reserva' THEN
    UPDATE public.stock_items
       SET in_process = GREATEST(in_process - NEW.quantity, 0),
           available = available + NEW.quantity
     WHERE id = NEW.stock_item_id;

  ELSE
    -- Fallback to legacy direction-based behaviour
    IF NEW.direction = 'entrega' THEN
      IF current_available < NEW.quantity THEN
        RAISE EXCEPTION 'Stock insuficiente: disponible %, solicitado %', current_available, NEW.quantity;
      END IF;
      UPDATE public.stock_items SET available = available - NEW.quantity WHERE id = NEW.stock_item_id;
    ELSE
      UPDATE public.stock_items SET available = available + NEW.quantity WHERE id = NEW.stock_item_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
