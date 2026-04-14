ALTER TABLE public.production_orders
  ADD COLUMN IF NOT EXISTS finished_photo_url text,
  ADD COLUMN IF NOT EXISTS packager_name text,
  ADD COLUMN IF NOT EXISTS final_count integer;