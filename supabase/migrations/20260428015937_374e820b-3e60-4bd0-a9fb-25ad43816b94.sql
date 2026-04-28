-- Tabla de reglas de comisión por marca/tipo de venta
CREATE TABLE public.commission_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL,
  sale_type TEXT NOT NULL DEFAULT 'mayor',
  percentage NUMERIC NOT NULL DEFAULT 5,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(brand, sale_type)
);

ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;

-- Admin gestiona; admin/contabilidad/asesor pueden leer
CREATE POLICY "Admins manage commission rules"
ON public.commission_rules FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view commission rules"
ON public.commission_rules FOR SELECT
TO authenticated
USING (true);

CREATE TRIGGER update_commission_rules_updated_at
BEFORE UPDATE ON public.commission_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reglas iniciales
INSERT INTO public.commission_rules (brand, sale_type, percentage, notes) VALUES
  ('magical_warmers', 'mayor', 5, 'Comisión estándar mayoreo Magical Warmers'),
  ('magical_warmers', 'menor', 3, 'Comisión retail Magical Warmers'),
  ('sweatspot', 'mayor', 5, 'Comisión estándar mayoreo Sweatspot'),
  ('sweatspot', 'menor', 3, 'Comisión retail Sweatspot');