
-- ============================================================
-- POS LOCATIONS (puntos de venta físicos)
-- ============================================================
CREATE TABLE public.pos_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL,
  address text,
  status text NOT NULL DEFAULT 'activo',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_locations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER pos_locations_updated_at
  BEFORE UPDATE ON public.pos_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- POS LOCATION ASSIGNMENTS (asesor del punto)
-- ============================================================
CREATE TABLE public.pos_location_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.pos_locations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, location_id)
);

ALTER TABLE public.pos_location_assignments ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is POS asesor for a location
CREATE OR REPLACE FUNCTION public.is_pos_for_location(_location_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pos_location_assignments
    WHERE user_id = auth.uid() AND location_id = _location_id
  )
$$;

-- ============================================================
-- POS PRODUCTS (catálogo del punto)
-- ============================================================
CREATE TABLE public.pos_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.pos_locations(id) ON DELETE CASCADE,
  name text NOT NULL,
  brand text,
  supplier text,
  category text,
  sale_price numeric NOT NULL DEFAULT 0,
  avg_cost numeric NOT NULL DEFAULT 0,
  available numeric NOT NULL DEFAULT 0,
  min_stock numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'unidades',
  photo_url text,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_products ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_pos_products_location ON public.pos_products(location_id);

CREATE TRIGGER pos_products_updated_at
  BEFORE UPDATE ON public.pos_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- POS CENTRAL TRANSFERS (traslados de casa matriz al punto)
-- ============================================================
CREATE TABLE public.pos_central_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.pos_locations(id) ON DELETE CASCADE,
  pos_product_id uuid REFERENCES public.pos_products(id) ON DELETE SET NULL,
  stock_item_id uuid,
  item_name text NOT NULL,
  brand text,
  quantity numeric NOT NULL,
  unit_cost numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendiente', -- pendiente | despachado | recibido | cancelado
  notes text,
  created_by uuid,
  created_by_name text,
  dispatched_by uuid,
  dispatched_at timestamptz,
  received_by uuid,
  received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_central_transfers ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_pos_transfers_location ON public.pos_central_transfers(location_id);

CREATE TRIGGER pos_transfers_updated_at
  BEFORE UPDATE ON public.pos_central_transfers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- POS INVENTORY MOVEMENTS
-- ============================================================
CREATE TABLE public.pos_inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.pos_locations(id) ON DELETE CASCADE,
  pos_product_id uuid REFERENCES public.pos_products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  direction text NOT NULL, -- entrada | salida
  source text NOT NULL,    -- compra_externa | traslado_central | venta | ajuste | devolucion
  quantity numeric NOT NULL,
  unit_cost numeric DEFAULT 0,
  unit_price numeric DEFAULT 0,
  supplier text,
  reference_id uuid,       -- id de venta o transferencia que originó el movimiento
  notes text,
  recorded_by uuid,
  recorded_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_pos_movements_location ON public.pos_inventory_movements(location_id);
CREATE INDEX idx_pos_movements_product ON public.pos_inventory_movements(pos_product_id);

-- ============================================================
-- POS SALES & SALE ITEMS
-- ============================================================
CREATE TABLE public.pos_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.pos_locations(id) ON DELETE CASCADE,
  client_name text,
  client_phone text,
  payment_method text,
  total_amount numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  notes text,
  recorded_by uuid NOT NULL,
  recorded_by_name text,
  sale_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_sales ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_pos_sales_location ON public.pos_sales(location_id);

CREATE TABLE public.pos_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.pos_sales(id) ON DELETE CASCADE,
  pos_product_id uuid REFERENCES public.pos_products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  brand text,
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  unit_cost numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_sale_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_pos_sale_items_sale ON public.pos_sale_items(sale_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- pos_locations
CREATE POLICY "Admin manages pos_locations"
  ON public.pos_locations FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Contabilidad views pos_locations"
  ON public.pos_locations FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'contabilidad'::app_role));

CREATE POLICY "POS asesor views own location"
  ON public.pos_locations FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'pos_punto'::app_role) AND is_pos_for_location(id));

-- pos_location_assignments
CREATE POLICY "Admin manages pos_location_assignments"
  ON public.pos_location_assignments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Contabilidad views pos_location_assignments"
  ON public.pos_location_assignments FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'contabilidad'::app_role));

CREATE POLICY "POS asesor views own assignment"
  ON public.pos_location_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- pos_products
CREATE POLICY "Admin manages pos_products"
  ON public.pos_products FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Contabilidad views pos_products"
  ON public.pos_products FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'contabilidad'::app_role));

CREATE POLICY "POS asesor views own pos_products"
  ON public.pos_products FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'pos_punto'::app_role) AND is_pos_for_location(location_id));

CREATE POLICY "POS asesor inserts own pos_products"
  ON public.pos_products FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'pos_punto'::app_role) AND is_pos_for_location(location_id));

CREATE POLICY "POS asesor updates own pos_products"
  ON public.pos_products FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'pos_punto'::app_role) AND is_pos_for_location(location_id))
  WITH CHECK (has_role(auth.uid(), 'pos_punto'::app_role) AND is_pos_for_location(location_id));

-- pos_central_transfers
CREATE POLICY "Admin manages pos_central_transfers"
  ON public.pos_central_transfers FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Inventarios manages pos_central_transfers"
  ON public.pos_central_transfers FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'inventarios'::app_role))
  WITH CHECK (has_role(auth.uid(), 'inventarios'::app_role));

CREATE POLICY "Contabilidad views pos_central_transfers"
  ON public.pos_central_transfers FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'contabilidad'::app_role));

CREATE POLICY "POS asesor views own transfers"
  ON public.pos_central_transfers FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'pos_punto'::app_role) AND is_pos_for_location(location_id));

CREATE POLICY "POS asesor receives own transfers"
  ON public.pos_central_transfers FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'pos_punto'::app_role) AND is_pos_for_location(location_id))
  WITH CHECK (has_role(auth.uid(), 'pos_punto'::app_role) AND is_pos_for_location(location_id));

-- pos_inventory_movements
CREATE POLICY "Admin manages pos_inventory_movements"
  ON public.pos_inventory_movements FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Contabilidad views pos_inventory_movements"
  ON public.pos_inventory_movements FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'contabilidad'::app_role));

CREATE POLICY "POS asesor views own movements"
  ON public.pos_inventory_movements FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'pos_punto'::app_role) AND is_pos_for_location(location_id));

CREATE POLICY "POS asesor inserts own movements"
  ON public.pos_inventory_movements FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'pos_punto'::app_role) AND is_pos_for_location(location_id) AND recorded_by = auth.uid());

-- pos_sales
CREATE POLICY "Admin manages pos_sales"
  ON public.pos_sales FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Contabilidad views pos_sales"
  ON public.pos_sales FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'contabilidad'::app_role));

CREATE POLICY "POS asesor views own pos_sales"
  ON public.pos_sales FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'pos_punto'::app_role) AND is_pos_for_location(location_id));

CREATE POLICY "POS asesor creates own pos_sales"
  ON public.pos_sales FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'pos_punto'::app_role) AND is_pos_for_location(location_id) AND recorded_by = auth.uid());

-- pos_sale_items
CREATE POLICY "Admin manages pos_sale_items"
  ON public.pos_sale_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Contabilidad views pos_sale_items"
  ON public.pos_sale_items FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'contabilidad'::app_role));

CREATE POLICY "POS asesor views own pos_sale_items"
  ON public.pos_sale_items FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'pos_punto'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.pos_sales s
      WHERE s.id = sale_id AND is_pos_for_location(s.location_id)
    )
  );

CREATE POLICY "POS asesor inserts own pos_sale_items"
  ON public.pos_sale_items FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'pos_punto'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.pos_sales s
      WHERE s.id = sale_id AND is_pos_for_location(s.location_id)
    )
  );

-- ============================================================
-- Seed: punto Sweatspot 92
-- ============================================================
INSERT INTO public.pos_locations (name, city, address, status, notes)
VALUES ('Sweatspot 92 POS', 'Bogotá', NULL, 'activo', 'Punto de venta independiente — opera con inventario propio.');
