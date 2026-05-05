ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS delivery_date date;

UPDATE public.production_orders po
SET delivery_date = o.delivery_date
FROM public.orders o
WHERE po.order_id = o.id AND po.delivery_date IS NULL AND o.delivery_date IS NOT NULL;