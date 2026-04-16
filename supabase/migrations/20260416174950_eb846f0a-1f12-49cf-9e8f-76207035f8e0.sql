-- Ferias module: integral management of fairs
CREATE TABLE public.ferias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  venue TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  stand_number TEXT,
  stand_size TEXT,
  stand_cost NUMERIC DEFAULT 0,
  transport_cost NUMERIC DEFAULT 0,
  lodging_cost NUMERIC DEFAULT 0,
  other_costs NUMERIC DEFAULT 0,
  assigned_staff TEXT[],
  materials_needed TEXT[],
  status TEXT NOT NULL DEFAULT 'planificada',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.feria_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feria_id UUID NOT NULL REFERENCES public.ferias(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity_assigned INTEGER NOT NULL DEFAULT 0,
  quantity_returned INTEGER DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.feria_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feria_id UUID NOT NULL REFERENCES public.ferias(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT,
  client_name TEXT,
  sale_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ferias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feria_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feria_sales ENABLE ROW LEVEL SECURITY;

-- RLS for ferias: admin/contabilidad/logistica can manage; everyone authenticated can view
CREATE POLICY "Authorized roles can manage ferias" ON public.ferias FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role) OR has_role(auth.uid(), 'logistica'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role) OR has_role(auth.uid(), 'logistica'::app_role));

CREATE POLICY "Authenticated can view ferias" ON public.ferias FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authorized roles can manage feria inventory" ON public.feria_inventory FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role) OR has_role(auth.uid(), 'logistica'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role) OR has_role(auth.uid(), 'logistica'::app_role));

CREATE POLICY "Authenticated can view feria inventory" ON public.feria_inventory FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authorized roles can manage feria sales" ON public.feria_sales FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role) OR has_role(auth.uid(), 'logistica'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role) OR has_role(auth.uid(), 'logistica'::app_role));

CREATE POLICY "Authenticated can view feria sales" ON public.feria_sales FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_ferias_updated_at BEFORE UPDATE ON public.ferias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feria_inventory_updated_at BEFORE UPDATE ON public.feria_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();