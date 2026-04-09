CREATE TABLE public.product_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  brand TEXT NOT NULL CHECK (brand IN ('magical', 'sweatspot')),
  raw_material_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  production_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(12,2) GENERATED ALWAYS AS (raw_material_cost + production_cost) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage product costs"
  ON public.product_costs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_product_costs_updated_at
  BEFORE UPDATE ON public.product_costs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();