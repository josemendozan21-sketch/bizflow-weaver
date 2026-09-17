CREATE OR REPLACE FUNCTION public.sync_feria_inventory_from_shipment_item()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sh public.feria_shipments%ROWTYPE;
  target uuid;
  sign integer;
  rec RECORD;
BEGIN
  rec := COALESCE(NEW, OLD);
  SELECT * INTO sh FROM public.feria_shipments WHERE id = rec.shipment_id;
  IF sh.id IS NULL OR sh.status <> 'confirmada' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  sign := CASE WHEN TG_OP = 'DELETE' THEN -1 ELSE 1 END;

  -- Emparejar primero por la referencia estable de Bodega, luego por nombre
  IF rec.stock_item_id IS NOT NULL THEN
    SELECT id INTO target FROM public.feria_inventory
     WHERE feria_id = sh.feria_id AND stock_item_id = rec.stock_item_id
     LIMIT 1;
  END IF;

  IF target IS NULL THEN
    SELECT id INTO target FROM public.feria_inventory
     WHERE feria_id = sh.feria_id
       AND brand = rec.brand
       AND lower(product_name) = lower(rec.item_name)
     LIMIT 1;
  END IF;

  IF target IS NULL THEN
    INSERT INTO public.feria_inventory (
      feria_id, brand, product_name, stock_item_id, quantity_assigned, quantity_returned,
      quantity_dispatched, dispatch_status, unit_price, unit_cost
    ) VALUES (
      sh.feria_id, rec.brand, rec.item_name, rec.stock_item_id,
      CASE WHEN sh.direction = 'salida' THEN GREATEST(sign * rec.quantity, 0) ELSE 0 END,
      CASE WHEN sh.direction = 'entrada' THEN GREATEST(sign * rec.quantity, 0) ELSE 0 END,
      CASE WHEN sh.direction = 'salida' THEN GREATEST(sign * rec.quantity, 0) ELSE 0 END,
      CASE WHEN sh.direction = 'salida' THEN 'despachado' ELSE 'pendiente' END,
      rec.unit_price, rec.unit_cost
    );
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF sh.direction = 'salida' THEN
    UPDATE public.feria_inventory
       SET quantity_dispatched = GREATEST(COALESCE(quantity_dispatched,0) + sign * rec.quantity, 0),
           quantity_assigned = GREATEST(quantity_assigned, COALESCE(quantity_dispatched,0) + sign * rec.quantity),
           dispatch_status = 'despachado',
           stock_item_id = COALESCE(stock_item_id, rec.stock_item_id),
           updated_at = now()
     WHERE id = target;
  ELSE
    UPDATE public.feria_inventory
       SET quantity_returned = GREATEST(COALESCE(quantity_returned,0) + sign * rec.quantity, 0),
           stock_item_id = COALESCE(stock_item_id, rec.stock_item_id),
           updated_at = now()
     WHERE id = target;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;