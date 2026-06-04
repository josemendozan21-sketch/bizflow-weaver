CREATE UNIQUE INDEX IF NOT EXISTS orders_external_order_id_unique_idx
ON public.orders (external_order_id)
WHERE external_order_id IS NOT NULL;