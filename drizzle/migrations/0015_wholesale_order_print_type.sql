ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS print_type text;
ALTER TABLE public.orders ADD CONSTRAINT orders_print_type_allowed CHECK (print_type IS NULL OR print_type IN ('full', 'basica'));
COMMENT ON COLUMN public.orders.print_type IS 'Sweat Spot wholesale print mode: full or basica; null for legacy/Magical orders.';