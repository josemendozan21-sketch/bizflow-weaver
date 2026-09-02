ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS ink_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ink_color_2 text,
  ADD COLUMN IF NOT EXISTS ink_color_3 text,
  ADD COLUMN IF NOT EXISTS glitter_color text;

ALTER TABLE public.production_orders
  ADD COLUMN IF NOT EXISTS ink_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ink_color_2 text,
  ADD COLUMN IF NOT EXISTS ink_color_3 text,
  ADD COLUMN IF NOT EXISTS glitter_color text;