ALTER TABLE public.ferias
  ADD COLUMN IF NOT EXISTS setup_date DATE,
  ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tickets_cost NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advertising_cost NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS merchandise_cost NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS employees_cost NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS food_cost NUMERIC DEFAULT 0;

-- Rename for clarity (keep old data intact)
COMMENT ON COLUMN public.ferias.stand_cost IS 'Costo Feria (alquiler stand/inscripción)';
COMMENT ON COLUMN public.ferias.transport_cost IS 'Viáticos: Transporte';
COMMENT ON COLUMN public.ferias.lodging_cost IS 'Viáticos: Hospedaje';
COMMENT ON COLUMN public.ferias.other_costs IS 'Otros costos varios';