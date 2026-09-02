ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS logo_source TEXT,
  ADD COLUMN IF NOT EXISTS logo_source_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS logo_source_by UUID,
  ADD COLUMN IF NOT EXISTS logo_source_by_name TEXT;

ALTER TABLE public.logo_requests
  ADD COLUMN IF NOT EXISTS from_recompra BOOLEAN NOT NULL DEFAULT false;