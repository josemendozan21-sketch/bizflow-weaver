ALTER TABLE public.feria_sales
  ADD COLUMN IF NOT EXISTS client_document text,
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS client_phone text,
  ADD COLUMN IF NOT EXISTS client_address text,
  ADD COLUMN IF NOT EXISTS client_city text;