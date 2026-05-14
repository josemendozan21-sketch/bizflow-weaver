
CREATE TABLE public.pos_cash_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL,
  amount numeric NOT NULL,
  concept text NOT NULL,
  requested_by uuid NOT NULL,
  requested_by_name text,
  proof_url text,
  status text NOT NULL DEFAULT 'pendiente',
  approved_by uuid,
  approved_by_name text,
  approved_at timestamptz,
  rejection_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_cash_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages pos_cash_withdrawals"
ON public.pos_cash_withdrawals FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'::app_role))
WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Contabilidad manages pos_cash_withdrawals"
ON public.pos_cash_withdrawals FOR ALL TO authenticated
USING (has_role(auth.uid(),'contabilidad'::app_role))
WITH CHECK (has_role(auth.uid(),'contabilidad'::app_role));

CREATE POLICY "POS asesor inserts own withdrawal"
ON public.pos_cash_withdrawals FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(),'pos_punto'::app_role)
  AND is_pos_for_location(location_id)
  AND requested_by = auth.uid()
);

CREATE POLICY "POS asesor views own withdrawals"
ON public.pos_cash_withdrawals FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'pos_punto'::app_role)
  AND is_pos_for_location(location_id)
);

CREATE TRIGGER update_pos_cash_withdrawals_updated_at
BEFORE UPDATE ON public.pos_cash_withdrawals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public)
VALUES ('pos-cash-proofs','pos-cash-proofs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read pos cash proofs"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'pos-cash-proofs');

CREATE POLICY "Authenticated upload pos cash proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'pos-cash-proofs');
