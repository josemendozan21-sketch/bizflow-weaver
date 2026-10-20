CREATE OR REPLACE FUNCTION public.prevent_duplicate_orders()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.external_order_id IS NOT NULL THEN RETURN NEW; END IF;
  IF EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.brand = NEW.brand AND o.client_name = NEW.client_name
      AND o.product = NEW.product AND o.quantity = NEW.quantity
      AND COALESCE(o.advisor_id::text,'') = COALESCE(NEW.advisor_id::text,'')
      AND o.created_at > now() - interval '2 minutes'
      AND (NEW.submission_id IS NULL OR o.submission_id IS NULL OR o.submission_id <> NEW.submission_id)
  ) THEN
    RAISE EXCEPTION 'Pedido duplicado detectado (mismo cliente y producto en menos de 2 minutos)';
  END IF;
  RETURN NEW;
END;
$function$;