ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS returned_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS return_notes text;

CREATE INDEX IF NOT EXISTS idx_orders_returned_at ON public.orders (returned_at) WHERE returned_at IS NOT NULL;