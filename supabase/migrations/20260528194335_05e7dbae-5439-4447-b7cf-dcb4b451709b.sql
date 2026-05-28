ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_date date;
UPDATE public.orders SET payment_date = created_at::date WHERE payment_date IS NULL;
ALTER TABLE public.orders ALTER COLUMN payment_date SET DEFAULT (now())::date;