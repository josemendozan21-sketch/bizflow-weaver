
-- Stock items table
CREATE TABLE IF NOT EXISTS public.stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  brand text NOT NULL,
  available numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'unidades',
  min_stock numeric NOT NULL DEFAULT 0,
  product_type text,
  color text,
  logo text,
  sweatspot_category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Body stock table (cuerpos/envases)
CREATE TABLE IF NOT EXISTS public.body_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  referencia text NOT NULL,
  available integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_stock ENABLE ROW LEVEL SECURITY;

-- RLS policies for stock_items
CREATE POLICY "Authenticated users can view stock items"
  ON public.stock_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage stock items"
  ON public.stock_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Production can manage stock items"
  ON public.stock_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'produccion'::app_role));

CREATE POLICY "Advisors can view and update stock items"
  ON public.stock_items FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'asesor_comercial'::app_role));

CREATE POLICY "Stamping can manage stock items"
  ON public.stock_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'estampacion'::app_role));

-- RLS policies for body_stock
CREATE POLICY "Authenticated users can view body stock"
  ON public.body_stock FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage body stock"
  ON public.body_stock FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Production can manage body stock"
  ON public.body_stock FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'produccion'::app_role));

CREATE POLICY "Advisors can update body stock"
  ON public.body_stock FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'asesor_comercial'::app_role));

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.body_stock;

-- Timestamp trigger for stock_items
CREATE TRIGGER update_stock_items_updated_at
  BEFORE UPDATE ON public.stock_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Timestamp trigger for body_stock
CREATE TRIGGER update_body_stock_updated_at
  BEFORE UPDATE ON public.body_stock
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
