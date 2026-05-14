ALTER TABLE public.production_orders DROP CONSTRAINT IF EXISTS production_orders_order_id_fkey;
ALTER TABLE public.production_orders
  ADD CONSTRAINT production_orders_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE public.body_production_tasks DROP CONSTRAINT IF EXISTS body_production_tasks_production_order_id_fkey;
ALTER TABLE public.body_production_tasks
  ADD CONSTRAINT body_production_tasks_production_order_id_fkey
  FOREIGN KEY (production_order_id) REFERENCES public.production_orders(id) ON DELETE CASCADE;

ALTER TABLE public.body_production_tasks DROP CONSTRAINT IF EXISTS body_production_tasks_order_id_fkey;
ALTER TABLE public.body_production_tasks
  ADD CONSTRAINT body_production_tasks_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;