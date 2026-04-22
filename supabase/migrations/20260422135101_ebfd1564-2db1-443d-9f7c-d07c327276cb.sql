
UPDATE public.production_orders
SET stages = ARRAY['produccion_cuerpos']::text[] || stages
WHERE brand = 'sweatspot'
  AND current_stage = 'produccion_cuerpos'
  AND NOT ('produccion_cuerpos' = ANY(stages));
