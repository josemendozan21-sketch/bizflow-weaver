CREATE OR REPLACE FUNCTION public.auto_create_retail_inventory_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  matched_item_id uuid;
BEGIN
  IF NEW.sale_type NOT IN ('menor','detal') THEN
    RETURN NEW;
  END IF;

  SELECT id INTO matched_item_id
    FROM public.stock_items
    WHERE brand = NEW.brand
      AND category = 'producto_terminado'
      AND lower(name) = lower(NEW.product)
    LIMIT 1;

  INSERT INTO public.inventory_requests (
    requester_id, requester_name, requester_area,
    brand, category, stock_item_id, item_name, quantity,
    reason, order_id, routed_to, item_type, urgency
  ) VALUES (
    NEW.advisor_id,
    COALESCE(NEW.advisor_name, 'Asesor'),
    'asesor_comercial',
    NEW.brand,
    'producto_terminado',
    matched_item_id,
    NEW.product,
    GREATEST(NEW.quantity, 1),
    'Pedido al detal de ' || NEW.client_name,
    NEW.id,
    'logistica',
    'producto_terminado',
    'normal'
  );

  RETURN NEW;
END;
$function$;

-- Permitir que el rol logística vea las solicitudes de inventario ruteadas a él
CREATE POLICY "Logistica can view routed requests"
  ON public.inventory_requests
  FOR SELECT
  USING (has_role(auth.uid(), 'logistica'::app_role));

-- Normalizar el pedido existente que entró desde el webhook con sale_type='detal'
UPDATE public.orders SET sale_type = 'menor' WHERE sale_type = 'detal';