
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS invoice_amount numeric,
  ADD COLUMN IF NOT EXISTS invoice_notes text,
  ADD COLUMN IF NOT EXISTS invoice_date date,
  ADD COLUMN IF NOT EXISTS invoice_status text NOT NULL DEFAULT 'pendiente';
