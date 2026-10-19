CREATE TABLE public.commission_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id uuid NOT NULL,
  advisor_name text,
  pay_period text NOT NULL,
  status text NOT NULL DEFAULT 'pendiente_pago',
  current_amount numeric NOT NULL DEFAULT 0,
  carryover_amount numeric NOT NULL DEFAULT 0,
  bonus_amount numeric NOT NULL DEFAULT 0,
  adjustment_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  notes text,
  approved_by uuid, approved_at timestamptz,
  returned_note text,
  confirmed_by uuid, confirmed_at timestamptz,
  dispute_note text, disputed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (advisor_id, pay_period)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_settlements TO authenticated;
GRANT ALL ON public.commission_settlements TO service_role;
ALTER TABLE public.commission_settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cs staff all" ON public.commission_settlements FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'contabilidad'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'contabilidad'));
CREATE POLICY "cs advisor read" ON public.commission_settlements FOR SELECT TO authenticated
  USING (advisor_id = auth.uid() OR has_role(auth.uid(),'visualizador'));

CREATE TABLE public.commission_settlement_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id uuid NOT NULL REFERENCES public.commission_settlements(id) ON DELETE CASCADE,
  order_id uuid NOT NULL UNIQUE,
  order_code text,
  client_name text,
  sale_date date,
  completed_date date,
  causation_period text NOT NULL,
  base_amount numeric NOT NULL DEFAULT 0,
  rate numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  is_carryover boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_settlement_items TO authenticated;
GRANT ALL ON public.commission_settlement_items TO service_role;
ALTER TABLE public.commission_settlement_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "csi staff all" ON public.commission_settlement_items FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'contabilidad'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'contabilidad'));
CREATE POLICY "csi advisor read" ON public.commission_settlement_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.commission_settlements s WHERE s.id = settlement_id AND (s.advisor_id = auth.uid() OR has_role(auth.uid(),'visualizador'))));

CREATE TABLE public.commission_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id uuid REFERENCES public.commission_settlements(id) ON DELETE SET NULL,
  advisor_id uuid NOT NULL,
  pay_period text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  paid_at date NOT NULL DEFAULT current_date,
  reference text,
  proof_url text,
  notes text,
  registered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_payouts TO authenticated;
GRANT ALL ON public.commission_payouts TO service_role;
ALTER TABLE public.commission_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cp staff all" ON public.commission_payouts FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'contabilidad'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'contabilidad'));
CREATE POLICY "cp advisor read" ON public.commission_payouts FOR SELECT TO authenticated
  USING (advisor_id = auth.uid() OR has_role(auth.uid(),'visualizador'));

CREATE TABLE public.commission_settlement_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id uuid NOT NULL REFERENCES public.commission_settlements(id) ON DELETE CASCADE,
  action text NOT NULL,
  note text,
  amount numeric,
  actor_id uuid DEFAULT auth.uid(),
  actor_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.commission_settlement_log TO authenticated;
GRANT ALL ON public.commission_settlement_log TO service_role;
ALTER TABLE public.commission_settlement_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "csl staff all" ON public.commission_settlement_log FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'contabilidad'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'contabilidad'));
CREATE POLICY "csl advisor read" ON public.commission_settlement_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.commission_settlements s WHERE s.id = settlement_id AND (s.advisor_id = auth.uid() OR has_role(auth.uid(),'visualizador'))));

CREATE TRIGGER trg_cs_updated BEFORE UPDATE ON public.commission_settlements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.advisor_respond_settlement(_settlement_id uuid, _confirm boolean, _note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; paid numeric;
BEGIN
  SELECT * INTO s FROM commission_settlements WHERE id = _settlement_id;
  IF s IS NULL OR s.advisor_id <> auth.uid() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF s.status = 'saldado' THEN RAISE EXCEPTION 'La liquidación ya está saldada'; END IF;
  SELECT COALESCE(sum(amount),0) INTO paid FROM commission_payouts WHERE settlement_id = _settlement_id;
  IF _confirm THEN
    IF paid <= 0 THEN RAISE EXCEPTION 'Aún no hay pagos registrados'; END IF;
    UPDATE commission_settlements SET confirmed_by = auth.uid(), confirmed_at = now(), dispute_note = NULL,
      status = CASE WHEN paid >= total_amount THEN 'saldado' ELSE 'pago_registrado' END
      WHERE id = _settlement_id;
    INSERT INTO commission_settlement_log(settlement_id, action, note, amount) VALUES (_settlement_id, 'confirmado_asesor', _note, paid);
  ELSE
    IF coalesce(trim(_note),'') = '' THEN RAISE EXCEPTION 'Describe la diferencia'; END IF;
    UPDATE commission_settlements SET status = 'en_revision', dispute_note = _note, disputed_at = now() WHERE id = _settlement_id;
    INSERT INTO commission_settlement_log(settlement_id, action, note) VALUES (_settlement_id, 'diferencia_reportada', _note);
  END IF;
  RETURN jsonb_build_object('ok', true);
END $$;
GRANT EXECUTE ON FUNCTION public.advisor_respond_settlement(uuid, boolean, text) TO authenticated;