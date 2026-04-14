
-- Petty cash fund (initial balance set by admin)
CREATE TABLE public.petty_cash_funds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount numeric NOT NULL DEFAULT 0,
  set_by uuid NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.petty_cash_funds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage petty cash funds" ON public.petty_cash_funds
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Contabilidad can view petty cash funds" ON public.petty_cash_funds
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'contabilidad'::app_role));

CREATE POLICY "Contabilidad can create petty cash funds" ON public.petty_cash_funds
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'contabilidad'::app_role));

-- Petty cash expenses
CREATE TABLE public.petty_cash_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fund_id uuid NOT NULL REFERENCES public.petty_cash_funds(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  description text NOT NULL,
  requested_by text NOT NULL,
  proof_url text,
  recorded_by uuid NOT NULL,
  recorded_by_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.petty_cash_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage petty cash expenses" ON public.petty_cash_expenses
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Contabilidad can manage petty cash expenses" ON public.petty_cash_expenses
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'contabilidad'::app_role));

-- Storage bucket for petty cash proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('petty-cash-proofs', 'petty-cash-proofs', true);

CREATE POLICY "Authenticated can upload petty cash proofs" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'petty-cash-proofs');

CREATE POLICY "Authenticated can view petty cash proofs" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'petty-cash-proofs');
