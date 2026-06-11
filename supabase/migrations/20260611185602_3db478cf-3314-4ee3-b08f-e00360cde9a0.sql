ALTER TABLE public.pos_locations ADD COLUMN IF NOT EXISTS cash_base numeric NOT NULL DEFAULT 0;
UPDATE public.pos_locations SET cash_base = 215400 WHERE id = '73050f3b-1c8e-44f1-9d0d-94772216c100';