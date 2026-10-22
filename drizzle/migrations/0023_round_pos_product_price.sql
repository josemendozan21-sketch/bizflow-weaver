CREATE OR REPLACE FUNCTION public.round_pos_product_price() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.sale_price IS NOT NULL THEN NEW.sale_price := round(NEW.sale_price); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_round_pos_product_price ON public.pos_products;
CREATE TRIGGER trg_round_pos_product_price BEFORE INSERT OR UPDATE OF sale_price ON public.pos_products FOR EACH ROW EXECUTE FUNCTION public.round_pos_product_price();