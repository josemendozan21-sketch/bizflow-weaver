
UPDATE public.body_stock SET brand = 'magical' WHERE brand = 'magical_warmers';

CREATE OR REPLACE FUNCTION public.mirror_body_stock_to_stock_items()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  base_name text;
  tipo text;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF NEW.available IS NOT DISTINCT FROM OLD.available THEN RETURN NEW; END IF;
  base_name := btrim(regexp_replace(NEW.referencia, '\s*\((Frío|Frio|Térmico|Termico|Calor)\)\s*$', '', 'i'));
  tipo := CASE
    WHEN NEW.referencia ~* '\((Frío|Frio)\)\s*$' THEN 'Frío'
    WHEN NEW.referencia ~* '\((Térmico|Termico|Calor)\)\s*$' THEN 'Térmico'
    ELSE NULL END;
  IF tipo IS NULL THEN RETURN NEW; END IF;
  UPDATE public.stock_items
     SET available = NEW.available
   WHERE category = 'cuerpos_referencias'
     AND brand = NEW.brand
     AND lower(name) = lower(base_name)
     AND product_type ILIKE tipo
     AND available IS DISTINCT FROM NEW.available;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_mirror_body_to_stock ON public.body_stock;
CREATE TRIGGER trg_mirror_body_to_stock
AFTER UPDATE OF available ON public.body_stock
FOR EACH ROW EXECUTE FUNCTION public.mirror_body_stock_to_stock_items();

CREATE OR REPLACE FUNCTION public.mirror_stock_items_to_body_stock()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE composed_ref text;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF NEW.category <> 'cuerpos_referencias' THEN RETURN NEW; END IF;
  IF NEW.available IS NOT DISTINCT FROM OLD.available THEN RETURN NEW; END IF;
  IF NEW.product_type IS NULL OR btrim(NEW.product_type) = '' THEN RETURN NEW; END IF;
  composed_ref := NEW.name || ' (' || CASE
    WHEN NEW.product_type ILIKE 'frio' OR NEW.product_type ILIKE 'frío' THEN 'Frío'
    WHEN NEW.product_type ILIKE 'termico' OR NEW.product_type ILIKE 'térmico' OR NEW.product_type ILIKE 'calor' THEN 'Térmico'
    ELSE NEW.product_type END || ')';
  UPDATE public.body_stock
     SET available = NEW.available
   WHERE brand = NEW.brand
     AND lower(referencia) = lower(composed_ref)
     AND available IS DISTINCT FROM NEW.available;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_mirror_stock_to_body ON public.stock_items;
CREATE TRIGGER trg_mirror_stock_to_body
AFTER UPDATE OF available ON public.stock_items
FOR EACH ROW EXECUTE FUNCTION public.mirror_stock_items_to_body_stock();

-- One-time sync using GREATEST
DO $$
DECLARE r record; target numeric;
BEGIN
  FOR r IN
    WITH bs_parsed AS (
      SELECT id, brand, available,
        btrim(regexp_replace(referencia, '\s*\((Frío|Frio|Térmico|Termico|Calor)\)\s*$', '', 'i')) AS base_name,
        CASE
          WHEN referencia ~* '\((Frío|Frio)\)\s*$' THEN 'Frío'
          WHEN referencia ~* '\((Térmico|Termico|Calor)\)\s*$' THEN 'Térmico'
          ELSE NULL END AS tipo
      FROM public.body_stock
    )
    SELECT si.id AS si_id, bs.id AS bs_id, si.available AS si_av, bs.available AS bs_av
    FROM public.stock_items si
    JOIN bs_parsed bs
      ON bs.brand = si.brand
     AND lower(bs.base_name) = lower(si.name)
     AND (
       (bs.tipo = 'Frío' AND (si.product_type ILIKE 'frío' OR si.product_type ILIKE 'frio'))
       OR (bs.tipo = 'Térmico' AND (si.product_type ILIKE 'térmico' OR si.product_type ILIKE 'termico' OR si.product_type ILIKE 'calor'))
     )
    WHERE si.category = 'cuerpos_referencias'
  LOOP
    target := GREATEST(COALESCE(r.si_av, 0), COALESCE(r.bs_av, 0));
    IF r.si_av IS DISTINCT FROM target THEN
      UPDATE public.stock_items SET available = target WHERE id = r.si_id;
    END IF;
    IF r.bs_av IS DISTINCT FROM target THEN
      UPDATE public.body_stock SET available = target WHERE id = r.bs_id;
    END IF;
  END LOOP;
END $$;
