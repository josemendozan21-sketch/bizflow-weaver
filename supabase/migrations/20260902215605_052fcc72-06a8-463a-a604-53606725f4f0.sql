CREATE OR REPLACE FUNCTION public.log_order_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.log_order_change() FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.log_logo_request_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  actor_name text;
BEGIN
  SELECT COALESCE(display_name, email) INTO actor_name FROM public.profiles WHERE user_id = actor;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.logo_request_status_log(logo_request_id, old_status, new_status, changed_by, changed_by_name, note)
    VALUES (NEW.id, NULL, NEW.status::text, actor, actor_name, 'Solicitud creada');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.logo_request_status_log(logo_request_id, old_status, new_status, changed_by, changed_by_name, note)
    VALUES (NEW.id, OLD.status::text, NEW.status::text, actor, actor_name,
      CASE WHEN NEW.adjusted_logo_url IS DISTINCT FROM OLD.adjusted_logo_url THEN 'Se subió/actualizó el diseño ajustado' ELSE NULL END);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.log_logo_request_status() FROM anon, authenticated;