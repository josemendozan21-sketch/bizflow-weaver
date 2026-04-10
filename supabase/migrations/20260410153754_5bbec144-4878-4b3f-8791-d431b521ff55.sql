
-- Create production_orders table
CREATE TABLE public.production_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  brand TEXT NOT NULL,
  client_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  current_stage TEXT NOT NULL DEFAULT 'estampacion',
  stage_status TEXT NOT NULL DEFAULT 'pendiente',
  workflow_type TEXT NOT NULL DEFAULT 'full',
  stages TEXT[] NOT NULL DEFAULT '{}',
  -- Technical fields
  gel_color TEXT,
  ink_color TEXT,
  logo_file TEXT,
  thermo_size TEXT,
  silicone_color TEXT,
  logo_type TEXT,
  needs_cuerpos BOOLEAN DEFAULT false,
  has_stock BOOLEAN DEFAULT true,
  molde TEXT,
  observations TEXT,
  -- Tracking
  advisor_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage all production orders"
  ON public.production_orders FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Production can view production orders"
  ON public.production_orders FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'produccion'));

CREATE POLICY "Production can update production orders"
  ON public.production_orders FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'produccion'));

CREATE POLICY "Stamping can view production orders"
  ON public.production_orders FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'estampacion'));

CREATE POLICY "Advisors can create production orders"
  ON public.production_orders FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'asesor_comercial') AND advisor_id = auth.uid());

CREATE POLICY "Advisors can view own production orders"
  ON public.production_orders FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'asesor_comercial') AND advisor_id = auth.uid());

CREATE POLICY "Visual users can view production orders"
  ON public.production_orders FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'usuario_visual'));

-- Trigger for updated_at
CREATE TRIGGER update_production_orders_updated_at
  BEFORE UPDATE ON public.production_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create body_production_tasks table
CREATE TABLE public.body_production_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  production_order_id UUID REFERENCES public.production_orders(id) ON DELETE SET NULL,
  tipo_plastico TEXT NOT NULL,
  referencia TEXT NOT NULL,
  unidades INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.body_production_tasks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage body tasks"
  ON public.body_production_tasks FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Production can view body tasks"
  ON public.body_production_tasks FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'produccion'));

CREATE POLICY "Production can manage body tasks"
  ON public.body_production_tasks FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'produccion'));

CREATE POLICY "Visual users can view body tasks"
  ON public.body_production_tasks FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'usuario_visual'));

-- Trigger for updated_at
CREATE TRIGGER update_body_tasks_updated_at
  BEFORE UPDATE ON public.body_production_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
