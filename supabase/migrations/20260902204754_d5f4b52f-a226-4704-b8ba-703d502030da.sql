ALTER TABLE public.petty_cash_funds
  ADD COLUMN IF NOT EXISTS sede text NOT NULL DEFAULT 'toberin',
  ADD COLUMN IF NOT EXISTS movement_kind text NOT NULL DEFAULT 'ingreso';

ALTER TABLE public.petty_cash_expenses
  ADD COLUMN IF NOT EXISTS sede text NOT NULL DEFAULT 'toberin',
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'contabilidad',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'aprobado',
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_by_name text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE public.petty_cash_expenses ALTER COLUMN fund_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.petty_cash_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sede text NOT NULL DEFAULT 'toberin',
  count_date date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Bogota')::date,
  expected_amount numeric NOT NULL DEFAULT 0,
  counted_amount numeric NOT NULL DEFAULT 0,
  difference numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.petty_cash_counts TO authenticated;
GRANT ALL ON public.petty_cash_counts TO service_role;

ALTER TABLE public.petty_cash_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can manage petty cash counts"
ON public.petty_cash_counts FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role));

CREATE POLICY "POS can view chico counts"
ON public.petty_cash_counts FOR SELECT TO authenticated
USING (sede = 'chico' AND has_role(auth.uid(), 'pos_punto'::app_role));

CREATE POLICY "POS can create chico counts"
ON public.petty_cash_counts FOR INSERT TO authenticated
WITH CHECK (sede = 'chico' AND has_role(auth.uid(), 'pos_punto'::app_role));

CREATE POLICY "Read-only role can view petty cash counts"
ON public.petty_cash_counts FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'visualizador'::app_role));

CREATE TRIGGER update_petty_cash_counts_updated_at
BEFORE UPDATE ON public.petty_cash_counts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "POS can view chico petty cash expenses"
ON public.petty_cash_expenses FOR SELECT TO authenticated
USING (sede = 'chico' AND has_role(auth.uid(), 'pos_punto'::app_role));

CREATE POLICY "POS can create chico petty cash expenses"
ON public.petty_cash_expenses FOR INSERT TO authenticated
WITH CHECK (sede = 'chico' AND origin = 'punto' AND status = 'pendiente' AND has_role(auth.uid(), 'pos_punto'::app_role));

CREATE POLICY "POS can view chico petty cash funds"
ON public.petty_cash_funds FOR SELECT TO authenticated
USING (sede = 'chico' AND has_role(auth.uid(), 'pos_punto'::app_role));

CREATE INDEX IF NOT EXISTS idx_petty_cash_funds_sede ON public.petty_cash_funds (sede, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_petty_cash_expenses_sede ON public.petty_cash_expenses (sede, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_petty_cash_counts_sede ON public.petty_cash_counts (sede, count_date DESC);