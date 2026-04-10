
-- Create orders table to persist order data for tracking
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL,
  sale_type TEXT NOT NULL DEFAULT 'mayor',
  client_name TEXT NOT NULL,
  client_nit TEXT,
  client_phone TEXT,
  client_email TEXT,
  client_address TEXT,
  client_city TEXT,
  product TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  abono NUMERIC DEFAULT 0,
  ink_color TEXT,
  gel_color TEXT,
  silicone_color TEXT,
  logo_url TEXT,
  observations TEXT,
  personalization TEXT,
  advisor_id UUID NOT NULL,
  advisor_name TEXT NOT NULL,
  production_status TEXT NOT NULL DEFAULT 'pendiente',
  delivery_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all orders"
  ON public.orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Advisors can create orders
CREATE POLICY "Advisors can create orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'asesor_comercial') AND advisor_id = auth.uid());

-- Advisors can view their own orders
CREATE POLICY "Advisors can view own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'asesor_comercial') AND advisor_id = auth.uid());

-- Production can view and update orders
CREATE POLICY "Production can view orders"
  ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'produccion'));

CREATE POLICY "Production can update orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'produccion'));

-- Stamping can view orders
CREATE POLICY "Stamping can view orders"
  ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'estampacion'));

-- Accounting can view orders
CREATE POLICY "Accounting can view orders"
  ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'contabilidad'));

-- Visual users can view orders
CREATE POLICY "Visual users can view orders"
  ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'usuario_visual'));

-- Auto-update updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
