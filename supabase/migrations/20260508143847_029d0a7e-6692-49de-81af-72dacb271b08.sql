
-- Auto-create body production task and notify when a production order arrives in produccion_cuerpos stage
CREATE OR REPLACE FUNCTION public.auto_create_body_task_for_production_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_name text;
  plastico text;
  existing_count integer;
BEGIN
  IF NEW.brand <> 'magical' THEN
    RETURN NEW;
  END IF;
  IF NEW.current_stage <> 'produccion_cuerpos' THEN
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.needs_cuerpos, false) = false THEN
    RETURN NEW;
  END IF;

  ref_name := COALESCE(NEW.molde, 'Sin referencia');
  -- Detect plastic type from molde text
  IF lower(ref_name) LIKE '%calor%' THEN
    plastico := 'calor';
  ELSE
    plastico := 'frio';
  END IF;

  -- Avoid duplicates linked to the same production order
  SELECT count(*) INTO existing_count
    FROM public.body_production_tasks
   WHERE production_order_id = NEW.id
     AND status IN ('pendiente','en_proceso');

  IF existing_count = 0 THEN
    INSERT INTO public.body_production_tasks (production_order_id, tipo_plastico, referencia, unidades, status)
    VALUES (NEW.id, plastico, ref_name, GREATEST(NEW.quantity,1), 'pendiente');
  END IF;

  -- Notify production team
  INSERT INTO public.notifications (target_role, title, message, type, reference_id)
  VALUES (
    'produccion',
    'Nueva orden requiere cuerpos',
    'Pedido de "' || NEW.client_name || '" requiere ' || NEW.quantity || ' uds de "' || ref_name || '". Producción de cuerpos pendiente.',
    'info',
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_body_task_for_production_order ON public.production_orders;
CREATE TRIGGER trg_auto_body_task_for_production_order
AFTER INSERT ON public.production_orders
FOR EACH ROW EXECUTE FUNCTION public.auto_create_body_task_for_production_order();

-- Backfill: create body tasks and notifications for existing production orders stuck in produccion_cuerpos without a task
INSERT INTO public.body_production_tasks (production_order_id, tipo_plastico, referencia, unidades, status)
SELECT po.id,
       CASE WHEN lower(COALESCE(po.molde,'')) LIKE '%calor%' THEN 'calor' ELSE 'frio' END,
       COALESCE(po.molde, 'Sin referencia'),
       GREATEST(po.quantity, 1),
       'pendiente'
FROM public.production_orders po
WHERE po.brand = 'magical'
  AND po.current_stage = 'produccion_cuerpos'
  AND COALESCE(po.needs_cuerpos, false) = true
  AND NOT EXISTS (
    SELECT 1 FROM public.body_production_tasks bpt
     WHERE bpt.production_order_id = po.id
       AND bpt.status IN ('pendiente','en_proceso')
  );

INSERT INTO public.notifications (target_role, title, message, type, reference_id)
SELECT 'produccion'::app_role,
       'Pedido pendiente de cuerpos',
       'Pedido de "' || po.client_name || '" requiere ' || po.quantity || ' uds de "' || COALESCE(po.molde,'sin referencia') || '". Producción de cuerpos pendiente.',
       'info',
       po.id
FROM public.production_orders po
WHERE po.brand = 'magical'
  AND po.current_stage = 'produccion_cuerpos'
  AND COALESCE(po.needs_cuerpos, false) = true;
