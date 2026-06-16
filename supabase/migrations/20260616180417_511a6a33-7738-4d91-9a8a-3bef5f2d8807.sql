
DROP INDEX IF EXISTS public.stock_items_name_brand_category_unique;

DELETE FROM public.stock_items
WHERE id = 'd0129b5e-053a-48e0-bf62-8a94a1bc04f3';

UPDATE public.body_stock SET available = available + 5
WHERE id = 'cb730a99-e48d-4460-bc5b-806e118697fe';
DELETE FROM public.body_stock WHERE id = '1a114c05-1b48-4b60-94bd-65a9fcec0adc';

UPDATE public.body_stock SET available = available + 30
WHERE id = '9197ee85-b810-4dcf-8cc1-70a73c15cfcb';
DELETE FROM public.body_stock WHERE id = '90571851-8027-4817-8d21-30f040cfd5dc';

UPDATE public.stock_items
SET name = trim(
  regexp_replace(
    regexp_replace(name, '\s*\((Frío|Frio|Térmico|Termico|Calor)\)\s*$', '', 'gi'),
    '\s*\((Frío|Frio|Térmico|Termico|Calor)\)\s*$', '', 'gi'
  )
)
WHERE brand IN ('magical','magical_warmers')
  AND name ~* '\((Frío|Frio|Térmico|Termico|Calor)\)\s*$';

CREATE UNIQUE INDEX IF NOT EXISTS stock_items_name_brand_category_type_unique
ON public.stock_items (name, brand, category, COALESCE(product_type, ''));
