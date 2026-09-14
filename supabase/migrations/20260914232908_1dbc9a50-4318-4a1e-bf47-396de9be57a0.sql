CREATE OR REPLACE FUNCTION public.fill_production_order_advisor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.advisor_id IS NULL THEN
    IF NEW.order_id IS NOT NULL THEN
      SELECT o.advisor_id INTO NEW.advisor_id FROM public.orders o WHERE o.id = NEW.order_id;
    END IF;
    IF NEW.advisor_id IS NULL AND NEW.order_code IS NOT NULL THEN
      SELECT o.advisor_id INTO NEW.advisor_id FROM public.orders o WHERE o.order_code = NEW.order_code LIMIT 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_production_order_advisor ON public.production_orders;
CREATE TRIGGER trg_fill_production_order_advisor
BEFORE INSERT OR UPDATE ON public.production_orders
FOR EACH ROW EXECUTE FUNCTION public.fill_production_order_advisor();