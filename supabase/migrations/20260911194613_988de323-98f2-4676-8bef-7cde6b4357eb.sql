CREATE OR REPLACE FUNCTION public.log_order_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  actor uuid := auth.uid();
  actor_name text;
BEGIN
  SELECT COALESCE(display_name, email) INTO actor_name FROM public.profiles WHERE user_id = actor;

  IF COALESCE(NEW.quantity,0) IS DISTINCT FROM COALESCE(OLD.quantity,0) THEN
    INSERT INTO public.order_change_log(order_id, order_code, field, old_value, new_value, changed_by, changed_by_name)
    VALUES (NEW.id, NEW.order_code, 'quantity', OLD.quantity::text, NEW.quantity::text, actor, actor_name);
  END IF;
  IF COALESCE(NEW.unit_price,0) IS DISTINCT FROM COALESCE(OLD.unit_price,0) THEN
    INSERT INTO public.order_change_log(order_id, order_code, field, old_value, new_value, changed_by, changed_by_name)
    VALUES (NEW.id, NEW.order_code, 'unit_price', OLD.unit_price::text, NEW.unit_price::text, actor, actor_name);
  END IF;
  IF COALESCE(NEW.total_amount,0) IS DISTINCT FROM COALESCE(OLD.total_amount,0) THEN
    INSERT INTO public.order_change_log(order_id, order_code, field, old_value, new_value, changed_by, changed_by_name)
    VALUES (NEW.id, NEW.order_code, 'total_amount', OLD.total_amount::text, NEW.total_amount::text, actor, actor_name);
  END IF;
  IF COALESCE(NEW.abono,0) IS DISTINCT FROM COALESCE(OLD.abono,0) THEN
    INSERT INTO public.order_change_log(order_id, order_code, field, old_value, new_value, changed_by, changed_by_name)
    VALUES (NEW.id, NEW.order_code, 'abono', OLD.abono::text, NEW.abono::text, actor, actor_name);
  END IF;
  IF NEW.production_status IS DISTINCT FROM OLD.production_status THEN
    INSERT INTO public.order_change_log(order_id, order_code, field, old_value, new_value, changed_by, changed_by_name)
    VALUES (NEW.id, NEW.order_code, 'production_status', OLD.production_status, NEW.production_status, actor, actor_name);
  END IF;
  IF NEW.ink_color IS DISTINCT FROM OLD.ink_color THEN
    INSERT INTO public.order_change_log(order_id, order_code, field, old_value, new_value, changed_by, changed_by_name)
    VALUES (NEW.id, NEW.order_code, 'ink_color', OLD.ink_color, NEW.ink_color, actor, actor_name);
  END IF;
  IF NEW.gel_color IS DISTINCT FROM OLD.gel_color THEN
    INSERT INTO public.order_change_log(order_id, order_code, field, old_value, new_value, changed_by, changed_by_name)
    VALUES (NEW.id, NEW.order_code, 'gel_color', OLD.gel_color, NEW.gel_color, actor, actor_name);
  END IF;
  IF COALESCE(NEW.shipping_payment_mode,'pendiente') IS DISTINCT FROM COALESCE(OLD.shipping_payment_mode,'pendiente') THEN
    INSERT INTO public.order_change_log(order_id, order_code, field, old_value, new_value, changed_by, changed_by_name)
    VALUES (NEW.id, NEW.order_code, 'shipping_payment_mode', COALESCE(OLD.shipping_payment_mode,'pendiente'), COALESCE(NEW.shipping_payment_mode,'pendiente'), actor, actor_name);
  END IF;
  IF COALESCE(NEW.shipping_cost,0) IS DISTINCT FROM COALESCE(OLD.shipping_cost,0) THEN
    INSERT INTO public.order_change_log(order_id, order_code, field, old_value, new_value, changed_by, changed_by_name)
    VALUES (NEW.id, NEW.order_code, 'shipping_cost', COALESCE(OLD.shipping_cost,0)::text, COALESCE(NEW.shipping_cost,0)::text, actor, actor_name);
  END IF;
  RETURN NEW;
END;
$function$;