
-- 1) FUSIÓN: sumar filas sin tipo a la variante Frío (si existe)
DO $$
DECLARE r record; frio_id uuid; frio_av numeric;
BEGIN
  FOR r IN
    SELECT id, brand, name, available FROM public.stock_items
    WHERE category='cuerpos_referencias'
      AND (product_type IS NULL OR btrim(product_type)='')
      AND brand <> 'sweatspot'  -- Termo sweatspot se conserva tal cual
  LOOP
    SELECT id, available INTO frio_id, frio_av
      FROM public.stock_items
     WHERE category='cuerpos_referencias' AND brand=r.brand
       AND lower(name)=lower(r.name)
       AND (product_type ILIKE 'frío' OR product_type ILIKE 'frio')
     LIMIT 1;
    IF frio_id IS NOT NULL THEN
      -- Sumar (los negativos también se suman, corrige sobregiros)
      UPDATE public.stock_items SET available = COALESCE(frio_av,0) + COALESCE(r.available,0)
       WHERE id = frio_id;
      DELETE FROM public.stock_items WHERE id = r.id;
    ELSE
      -- Sin variante Frío existente: convertir esta misma fila a Frío
      UPDATE public.stock_items SET product_type='Frío' WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

-- Lo mismo en body_stock: filas sin sufijo de tipo (ej. "Handy") → sumar a "Handy (Frío)"
DO $$
DECLARE r record; frio_id uuid; frio_av numeric;
BEGIN
  FOR r IN
    SELECT id, brand, referencia, available FROM public.body_stock
    WHERE referencia !~* '\((Frío|Frio|Térmico|Termico|Calor)\)\s*$'
  LOOP
    SELECT id, available INTO frio_id, frio_av
      FROM public.body_stock
     WHERE brand = r.brand AND lower(referencia) = lower(r.referencia || ' (Frío)')
     LIMIT 1;
    IF frio_id IS NOT NULL THEN
      UPDATE public.body_stock SET available = COALESCE(frio_av,0) + COALESCE(r.available,0)
       WHERE id = frio_id;
      DELETE FROM public.body_stock WHERE id = r.id;
    ELSE
      UPDATE public.body_stock SET referencia = r.referencia || ' (Frío)' WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

-- 2) Eliminar duplicado exacto en body_stock (conservar el más antiguo)
DELETE FROM public.body_stock
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY brand, referencia ORDER BY created_at ASC, id ASC) AS rn
    FROM public.body_stock
  ) t WHERE rn > 1
);

-- 3) Crear filas espejo faltantes en stock_items
INSERT INTO public.stock_items (name, category, brand, available, unit, min_stock, product_type)
SELECT 'Caracol', 'cuerpos_referencias', 'magical', 1010, 'Unidades', 0, 'Frío'
WHERE NOT EXISTS (
  SELECT 1 FROM public.stock_items
  WHERE category='cuerpos_referencias' AND brand='magical'
    AND lower(name)='caracol' AND product_type ILIKE 'frío'
);

INSERT INTO public.stock_items (name, category, brand, available, unit, min_stock, product_type)
SELECT 'Máscara', 'cuerpos_referencias', 'magical', 30, 'Unidades', 0, 'Frío'
WHERE NOT EXISTS (
  SELECT 1 FROM public.stock_items
  WHERE category='cuerpos_referencias' AND brand='magical'
    AND lower(name)='máscara' AND product_type ILIKE 'frío'
);

-- 4) Crear body_stock faltante para H Helix Térmico
INSERT INTO public.body_stock (brand, referencia, available)
SELECT 'magical', 'H Helix (Térmico)', 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.body_stock WHERE brand='magical' AND referencia='H Helix (Térmico)'
);

-- 5) Resetear Mezcla Gel negativo
UPDATE public.stock_items SET available = 0
WHERE category='materia_prima' AND lower(name)='mezcla gel' AND available < 0;
