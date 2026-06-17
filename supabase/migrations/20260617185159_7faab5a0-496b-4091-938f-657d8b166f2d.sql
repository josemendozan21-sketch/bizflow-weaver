
-- 1) Normalize legacy stock_items where the tipo is embedded in the name suffix.
--    For rows with a (Frío)/(Térmico)/(Calor) suffix and null product_type:
--      a) If a canonical row (same brand+category+base name, product_type set) exists,
--         merge available/min_stock into it (sum available, max min_stock) and delete the legacy.
--      b) Otherwise, strip the suffix and set product_type.
DO $$
DECLARE
  r RECORD;
  base_name TEXT;
  tipo_text TEXT;
  canonical_tipo TEXT;
  existing_id UUID;
BEGIN
  FOR r IN
    SELECT id, brand, category, name, available, min_stock
    FROM public.stock_items
    WHERE product_type IS NULL
      AND name ~* '\((Frío|Frio|Térmico|Termico|Calor)\)\s*$'
  LOOP
    base_name := regexp_replace(r.name, '\s*\((Frío|Frio|Térmico|Termico|Calor)\)\s*$', '', 'i');
    base_name := btrim(base_name);
    -- Handle accidental double suffix like "Hoja (Frío) (Frío)" by stripping again
    IF base_name ~* '\((Frío|Frio|Térmico|Termico|Calor)\)\s*$' THEN
      base_name := btrim(regexp_replace(base_name, '\s*\((Frío|Frio|Térmico|Termico|Calor)\)\s*$', '', 'i'));
    END IF;

    tipo_text := lower((regexp_matches(r.name, '\((Frío|Frio|Térmico|Termico|Calor)\)\s*$', 'i'))[1]);
    IF tipo_text IN ('frío', 'frio') THEN
      canonical_tipo := 'Frío';
    ELSE
      canonical_tipo := 'Térmico';
    END IF;

    SELECT id INTO existing_id
    FROM public.stock_items
    WHERE brand = r.brand
      AND category = r.category
      AND lower(name) = lower(base_name)
      AND product_type = canonical_tipo
    LIMIT 1;

    IF existing_id IS NOT NULL THEN
      UPDATE public.stock_items
      SET available = available + r.available,
          min_stock = GREATEST(min_stock, r.min_stock)
      WHERE id = existing_id;
      DELETE FROM public.stock_items WHERE id = r.id;
    ELSE
      UPDATE public.stock_items
      SET name = base_name,
          product_type = canonical_tipo
      WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

-- 2) Prevent the duplication from coming back: unique index on the canonical key.
CREATE UNIQUE INDEX IF NOT EXISTS stock_items_canonical_uniq
ON public.stock_items (brand, category, lower(name), coalesce(product_type, ''));

-- 3) Trigger that auto-normalizes the name on insert/update so future writes can't
--    sneak a "(Frío)" suffix back into the name field.
CREATE OR REPLACE FUNCTION public.normalize_stock_item_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  m TEXT;
BEGIN
  IF NEW.name IS NULL THEN
    RETURN NEW;
  END IF;
  -- Strip up to two trailing tipo suffixes
  FOR i IN 1..2 LOOP
    IF NEW.name ~* '\((Frío|Frio|Térmico|Termico|Calor)\)\s*$' THEN
      m := lower((regexp_matches(NEW.name, '\((Frío|Frio|Térmico|Termico|Calor)\)\s*$', 'i'))[1]);
      IF NEW.product_type IS NULL THEN
        IF m IN ('frío', 'frio') THEN
          NEW.product_type := 'Frío';
        ELSE
          NEW.product_type := 'Térmico';
        END IF;
      END IF;
      NEW.name := btrim(regexp_replace(NEW.name, '\s*\((Frío|Frio|Térmico|Termico|Calor)\)\s*$', '', 'i'));
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_stock_item_name ON public.stock_items;
CREATE TRIGGER trg_normalize_stock_item_name
BEFORE INSERT OR UPDATE ON public.stock_items
FOR EACH ROW EXECUTE FUNCTION public.normalize_stock_item_name();
