ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS price_includes_tax boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tax_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal_amount numeric;

COMMENT ON COLUMN public.orders.price_includes_tax IS 'true = el precio ingresado por el asesor ya incluye IVA';
COMMENT ON COLUMN public.orders.tax_rate IS 'Porcentaje de IVA aplicado (19 cuando el precio no lo incluye)';
COMMENT ON COLUMN public.orders.tax_amount IS 'Valor del IVA de esta linea; 0 cuando el precio ya lo incluye';
COMMENT ON COLUMN public.orders.subtotal_amount IS 'Base de productos de la linea, sin IVA ni envio ni cargos adicionales';