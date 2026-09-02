DELETE FROM public.bank_movements WHERE reference_kind = 'budget_entry';
DELETE FROM public.budget_entries;
DELETE FROM public.budget_lines;
DELETE FROM public.monthly_budgets;

CREATE TABLE public.accounting_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_code text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'gasto',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_code, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_accounts TO authenticated;
GRANT ALL ON public.accounting_accounts TO service_role;
ALTER TABLE public.accounting_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounting_accounts_select" ON public.accounting_accounts
FOR SELECT TO authenticated USING (true);
CREATE POLICY "accounting_accounts_manage" ON public.accounting_accounts
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'contabilidad'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'contabilidad'));

CREATE TABLE public.accounting_monthly_amounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounting_accounts(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount_kind text NOT NULL DEFAULT 'real',
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, year, month, amount_kind)
);

CREATE INDEX idx_acct_amounts_period ON public.accounting_monthly_amounts (year, month, amount_kind);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_monthly_amounts TO authenticated;
GRANT ALL ON public.accounting_monthly_amounts TO service_role;
ALTER TABLE public.accounting_monthly_amounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounting_amounts_select" ON public.accounting_monthly_amounts
FOR SELECT TO authenticated USING (true);
CREATE POLICY "accounting_amounts_manage" ON public.accounting_monthly_amounts
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'contabilidad'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'contabilidad'));

CREATE TRIGGER trg_accounting_accounts_updated BEFORE UPDATE ON public.accounting_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_accounting_amounts_updated BEFORE UPDATE ON public.accounting_monthly_amounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();