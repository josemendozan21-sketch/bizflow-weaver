ALTER TABLE public.pos_cash_withdrawals
  ADD COLUMN IF NOT EXISTS movement_type text NOT NULL DEFAULT 'retiro';

ALTER TABLE public.pos_cash_withdrawals
  DROP CONSTRAINT IF EXISTS pos_cash_withdrawals_movement_type_check;

ALTER TABLE public.pos_cash_withdrawals
  ADD CONSTRAINT pos_cash_withdrawals_movement_type_check
  CHECK (movement_type IN ('retiro','consignacion'));