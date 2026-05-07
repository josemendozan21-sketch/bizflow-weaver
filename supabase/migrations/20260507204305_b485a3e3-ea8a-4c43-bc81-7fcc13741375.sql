-- Add routing columns and broaden status options on inventory_requests
ALTER TABLE public.inventory_requests
  ADD COLUMN IF NOT EXISTS routed_to text,
  ADD COLUMN IF NOT EXISTS routed_at timestamptz;

-- Update trigger to handle new statuses (en_produccion, en_estampacion) without deducting stock
CREATE OR REPLACE FUNCTION public.process_inventory_request_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_available numeric;
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

    INSERT INTO public.notifications (target_user_id, target_role, title, message, type, reference_id)
    VALUES (NEW.requester_id, NEW.requester_area::app_role,
      'Solicitud aprobada',
      'Tu solicitud de ' || NEW.quantity || ' uds de "' || NEW.item_name || '" fue aprobada y enviada a logística.',
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

DROP TRIGGER IF EXISTS trg_process_inventory_request_approval ON public.inventory_requests;
CREATE TRIGGER trg_process_inventory_request_approval
  BEFORE UPDATE ON public.inventory_requests
  FOR EACH ROW EXECUTE FUNCTION public.process_inventory_request_approval();