ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS inventory_archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS inventory_archived_by uuid;

CREATE INDEX IF NOT EXISTS idx_orders_inventory_archived_at ON public.orders (inventory_archived_at);