
-- Create production_supply_orders table
CREATE TABLE IF NOT EXISTS public.production_supply_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  requested_by uuid NOT NULL,
  brand text NOT NULL,
  item_name text NOT NULL,
  item_type text NOT NULL DEFAULT 'materia_prima',
  quantity_requested numeric NOT NULL,
  unit text NOT NULL DEFAULT 'unidades',
  status text NOT NULL DEFAULT 'pendiente',
  notes text,
  completed_at timestamptz,
  completed_by uuid
);

-- Add validation trigger instead of CHECK constraints
CREATE OR REPLACE FUNCTION public.validate_supply_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.item_type NOT IN ('materia_prima', 'cuerpos') THEN
    RAISE EXCEPTION 'item_type must be materia_prima or cuerpos';
  END IF;
  IF NEW.status NOT IN ('pendiente', 'en_proceso', 'completado') THEN
    RAISE EXCEPTION 'status must be pendiente, en_proceso, or completado';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_supply_order_trigger
BEFORE INSERT OR UPDATE ON public.production_supply_orders
FOR EACH ROW EXECUTE FUNCTION public.validate_supply_order();

-- Update timestamp trigger
CREATE TRIGGER update_supply_orders_updated_at
BEFORE UPDATE ON public.production_supply_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.production_supply_orders ENABLE ROW LEVEL SECURITY;

-- All authenticated can read
CREATE POLICY "Authenticated can view supply orders"
ON public.production_supply_orders FOR SELECT
TO authenticated
USING (true);

-- All authenticated can create
CREATE POLICY "Authenticated can create supply orders"
ON public.production_supply_orders FOR INSERT
TO authenticated
WITH CHECK (true);

-- Admin can manage all
CREATE POLICY "Admins can manage supply orders"
ON public.production_supply_orders FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Production can update
CREATE POLICY "Production can update supply orders"
ON public.production_supply_orders FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'produccion'::app_role));
