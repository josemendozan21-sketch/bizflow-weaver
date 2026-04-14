
-- Function that auto-creates body production tasks when stock falls below minimum
CREATE OR REPLACE FUNCTION public.auto_create_body_task_on_low_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  shortage integer;
  plastico text;
  existing_count integer;
BEGIN
  -- Only for cuerpos_referencias and producto_terminado categories
  IF NEW.category NOT IN ('cuerpos_referencias', 'producto_terminado') THEN
    RETURN NEW;
  END IF;

  -- Only trigger when stock drops to or below minimum (and min_stock is configured)
  IF NEW.min_stock <= 0 OR NEW.available > NEW.min_stock THEN
    RETURN NEW;
  END IF;

  -- Only trigger on actual decrease (avoid triggering on unrelated updates)
  IF OLD.available <= OLD.min_stock AND NEW.available >= OLD.available THEN
    RETURN NEW;
  END IF;

  -- Check if there's already a pending/in_proceso task for this reference
  SELECT COUNT(*) INTO existing_count
  FROM public.body_production_tasks
  WHERE referencia = NEW.name
    AND status IN ('pendiente', 'en_proceso');

  IF existing_count > 0 THEN
    RETURN NEW;
  END IF;

  -- Calculate how many to produce (bring stock back up to minimum)
  shortage := GREATEST(NEW.min_stock - NEW.available, 1);

  -- Determine plastic type from product_type field
  plastico := COALESCE(NEW.product_type, 'frio');

  -- Create body production task automatically
  INSERT INTO public.body_production_tasks (tipo_plastico, referencia, unidades, status)
  VALUES (plastico, NEW.name, shortage, 'pendiente');

  -- Notify production team
  INSERT INTO public.notifications (target_role, title, message, type)
  VALUES (
    'produccion',
    'Producción automática requerida',
    'Se creó una tarea de producción de ' || shortage || ' uds de "' || NEW.name || '" por bajo inventario (stock: ' || NEW.available || ', mínimo: ' || NEW.min_stock || ').',
    'bajo_inventario'
  );

  RETURN NEW;
END;
$$;

-- Attach trigger to stock_items table
CREATE TRIGGER trigger_auto_body_task_on_low_stock
  AFTER UPDATE ON public.stock_items
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_body_task_on_low_stock();
