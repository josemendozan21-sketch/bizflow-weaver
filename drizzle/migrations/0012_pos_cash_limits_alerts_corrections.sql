ALTER TABLE public.pos_locations ADD COLUMN IF NOT EXISTS cash_min numeric NOT NULL DEFAULT 200000;
ALTER TABLE public.pos_locations ADD COLUMN IF NOT EXISTS cash_max_custody numeric NOT NULL DEFAULT 400000;

CREATE TABLE public.pos_cash_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL,
  alert_type text NOT NULL CHECK (alert_type IN ('max','min')),
  balance_at_open numeric NOT NULL,
  status text NOT NULL DEFAULT 'abierta' CHECK (status IN ('abierta','recogida_solicitada','pago_proveedores','resuelta')),
  action text,
  assigned_to text,
  due_date date,
  notes text,
  opened_by uuid DEFAULT auth.uid(),
  opened_at timestamptz NOT NULL DEFAULT now(),
  resolved_by uuid, resolved_at timestamptz, resolution_note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.pos_cash_alerts TO authenticated;
GRANT ALL ON public.pos_cash_alerts TO service_role;
ALTER TABLE public.pos_cash_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts read" ON public.pos_cash_alerts FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'contabilidad') OR has_role(auth.uid(),'visualizador') OR is_pos_for_location(location_id));
CREATE POLICY "alerts manage" ON public.pos_cash_alerts FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'contabilidad') OR is_pos_for_location(location_id))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'contabilidad') OR is_pos_for_location(location_id));
CREATE TRIGGER trg_pos_cash_alerts_updated BEFORE UPDATE ON public.pos_cash_alerts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.pos_cash_alert_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES public.pos_cash_alerts(id) ON DELETE CASCADE,
  action text NOT NULL, note text, balance numeric,
  actor_id uuid DEFAULT auth.uid(), actor_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.pos_cash_alert_log TO authenticated;
GRANT ALL ON public.pos_cash_alert_log TO service_role;
ALTER TABLE public.pos_cash_alert_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alert log read" ON public.pos_cash_alert_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM pos_cash_alerts a WHERE a.id = alert_id AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'contabilidad') OR has_role(auth.uid(),'visualizador') OR is_pos_for_location(a.location_id))));
CREATE POLICY "alert log insert" ON public.pos_cash_alert_log FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM pos_cash_alerts a WHERE a.id = alert_id AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'contabilidad') OR is_pos_for_location(a.location_id))));

CREATE TABLE public.pos_cash_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL,
  record_id uuid NOT NULL,
  old_amount numeric NOT NULL,
  new_amount numeric NOT NULL,
  reason text NOT NULL,
  corrected_by uuid DEFAULT auth.uid(),
  corrected_by_name text,
  corrected_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pos_cash_corrections TO authenticated;
GRANT ALL ON public.pos_cash_corrections TO service_role;
ALTER TABLE public.pos_cash_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "corrections read" ON public.pos_cash_corrections FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'contabilidad') OR has_role(auth.uid(),'visualizador') OR has_role(auth.uid(),'pos_punto'));

ALTER TABLE public.pos_cash_withdrawals DROP CONSTRAINT IF EXISTS pos_cash_withdrawals_movement_type_check;
ALTER TABLE public.pos_cash_withdrawals ADD CONSTRAINT pos_cash_withdrawals_movement_type_check CHECK (movement_type = ANY (ARRAY['retiro','consignacion','pago_proveedor']));
ALTER TABLE public.pos_cash_withdrawals ADD COLUMN IF NOT EXISTS alert_id uuid;

CREATE OR REPLACE FUNCTION public.open_pos_cash_alert(_location_id uuid, _type text, _balance numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing uuid; new_id uuid; msg text;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'contabilidad') OR is_pos_for_location(_location_id)) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  SELECT id INTO existing FROM pos_cash_alerts WHERE location_id = _location_id AND alert_type = _type AND status <> 'resuelta' LIMIT 1;
  IF existing IS NOT NULL THEN RETURN existing; END IF;
  INSERT INTO pos_cash_alerts(location_id, alert_type, balance_at_open) VALUES (_location_id, _type, _balance) RETURNING id INTO new_id;
  INSERT INTO pos_cash_alert_log(alert_id, action, balance) VALUES (new_id, 'abierta', _balance);
  msg := CASE WHEN _type = 'max'
    THEN 'El efectivo del Punto de la 92 es $' || to_char(_balance,'FM999G999G999') || ' y alcanzó el límite de custodia. Coordinar con Jose o Yeimy: recogida o pago a proveedores.'
    ELSE 'El efectivo del Punto de la 92 es $' || to_char(_balance,'FM999G999G999') || ', por debajo del mínimo de caja.' END;
  INSERT INTO notifications(target_role, title, message, type, reference_id)
  VALUES ('admin', CASE WHEN _type='max' THEN 'Alerta: límite de caja menor alcanzado' ELSE 'Alerta: caja menor bajo el mínimo' END, msg, 'warning', new_id),
         ('contabilidad', CASE WHEN _type='max' THEN 'Alerta: límite de caja menor alcanzado' ELSE 'Alerta: caja menor bajo el mínimo' END, msg, 'warning', new_id);
  RETURN new_id;
END $$;
GRANT EXECUTE ON FUNCTION public.open_pos_cash_alert(uuid, text, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.correct_cash_amount(_table text, _id uuid, _amount numeric, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old numeric; who text;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'contabilidad')) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF coalesce(trim(_reason),'') = '' THEN RAISE EXCEPTION 'Indica el motivo'; END IF;
  IF _amount IS NULL OR _amount < 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  SELECT email INTO who FROM auth.users WHERE id = auth.uid();
  IF _table = 'pos_cash_withdrawals' THEN
    SELECT amount INTO old FROM pos_cash_withdrawals WHERE id = _id; UPDATE pos_cash_withdrawals SET amount = _amount WHERE id = _id;
  ELSIF _table = 'petty_cash_expenses' THEN
    SELECT amount INTO old FROM petty_cash_expenses WHERE id = _id; UPDATE petty_cash_expenses SET amount = _amount WHERE id = _id;
  ELSIF _table = 'petty_cash_counts' THEN
    SELECT counted_amount INTO old FROM petty_cash_counts WHERE id = _id;
    UPDATE petty_cash_counts SET counted_amount = _amount, difference = _amount - expected_amount WHERE id = _id;
  ELSE RAISE EXCEPTION 'Tipo de registro no permitido'; END IF;
  IF old IS NULL THEN RAISE EXCEPTION 'Registro no encontrado'; END IF;
  INSERT INTO pos_cash_corrections(source_table, record_id, old_amount, new_amount, reason, corrected_by_name)
  VALUES (_table, _id, old, _amount, _reason, who);
  RETURN jsonb_build_object('old', old, 'new', _amount);
END $$;
GRANT EXECUTE ON FUNCTION public.correct_cash_amount(text, uuid, numeric, text) TO authenticated;