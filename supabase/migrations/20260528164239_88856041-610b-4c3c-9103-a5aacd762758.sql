ALTER TABLE public.budget_lines DROP CONSTRAINT IF EXISTS budget_lines_kind_check;
ALTER TABLE public.budget_lines ADD CONSTRAINT budget_lines_kind_check CHECK (kind IN ('ingreso','costo','gasto','pasivo','egreso'));

ALTER TABLE public.budget_entries DROP CONSTRAINT IF EXISTS budget_entries_kind_check;
ALTER TABLE public.budget_entries ADD CONSTRAINT budget_entries_kind_check CHECK (kind IN ('ingreso','costo','gasto','pasivo','egreso'));