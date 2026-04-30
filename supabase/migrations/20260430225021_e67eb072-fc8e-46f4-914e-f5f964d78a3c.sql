CREATE TABLE IF NOT EXISTS public.monthly_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  status text NOT NULL DEFAULT 'abierto',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (year, month)
);

CREATE TABLE IF NOT EXISTS public.budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.monthly_budgets(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('ingreso','egreso')),
  category text NOT NULL,
  description text,
  projected_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.budget_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.monthly_budgets(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('ingreso','egreso')),
  category text NOT NULL,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  entry_date date NOT NULL DEFAULT (now()::date),
  proof_url text,
  recorded_by uuid,
  recorded_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_lines_budget ON public.budget_lines(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_entries_budget ON public.budget_entries(budget_id);

ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and contabilidad manage monthly_budgets"
  ON public.monthly_budgets FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role));

CREATE POLICY "Admin and contabilidad manage budget_lines"
  ON public.budget_lines FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role));

CREATE POLICY "Admin and contabilidad manage budget_entries"
  ON public.budget_entries FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role));

CREATE TRIGGER trg_monthly_budgets_updated_at
  BEFORE UPDATE ON public.monthly_budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_budget_lines_updated_at
  BEFORE UPDATE ON public.budget_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public)
VALUES ('budget-receipts', 'budget-receipts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admin and contabilidad read budget receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'budget-receipts' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role)));

CREATE POLICY "Admin and contabilidad upload budget receipts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'budget-receipts' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role)));

CREATE POLICY "Admin and contabilidad delete budget receipts"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'budget-receipts' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role)));