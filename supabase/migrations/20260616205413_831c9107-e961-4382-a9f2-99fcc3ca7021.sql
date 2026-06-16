
ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS reception_confirmed boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reception_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reception_confirmed_by uuid,
  ADD COLUMN IF NOT EXISTS reception_confirmed_by_name text;
