CREATE TABLE public.order_value_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  requested_by_name text,
  current_amount numeric NOT NULL DEFAULT 0,
  proposed_amount numeric NOT NULL,
  reason text NOT NULL,
  evidence_url text,
  status text NOT NULL DEFAULT 'pendiente',
  resolved_by uuid,
  resolved_by_name text,
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_value_disputes_order ON public.order_value_disputes(order_id);
CREATE INDEX idx_order_value_disputes_status ON public.order_value_disputes(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_value_disputes TO authenticated;
GRANT ALL ON public.order_value_disputes TO service_role;

ALTER TABLE public.order_value_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors manage own disputes"
ON public.order_value_disputes FOR SELECT TO authenticated
USING (
  requested_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'contabilidad')
);

CREATE POLICY "Advisors create disputes"
ON public.order_value_disputes FOR INSERT TO authenticated
WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Accounting resolves disputes"
ON public.order_value_disputes FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'contabilidad'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'contabilidad'));

CREATE POLICY "Admins delete disputes"
ON public.order_value_disputes FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_order_value_disputes_updated_at
BEFORE UPDATE ON public.order_value_disputes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.resolve_order_value_dispute(
  _dispute_id uuid,
  _approve boolean,
  _note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.order_value_disputes%ROWTYPE;
  o public.orders%ROWTYPE;
  _name text;
  _qty numeric;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'contabilidad')) THEN
    RAISE EXCEPTION 'No autorizado para resolver solicitudes de corrección';
  END IF;

  SELECT * INTO d FROM public.order_value_disputes WHERE id = _dispute_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no encontrada'; END IF;
  IF d.status <> 'pendiente' THEN RAISE EXCEPTION 'La solicitud ya fue resuelta'; END IF;

  SELECT COALESCE(display_name, email) INTO _name FROM public.profiles WHERE user_id = auth.uid();

  IF _approve THEN
    SELECT * INTO o FROM public.orders WHERE id = d.order_id;
    _qty := NULLIF(COALESCE(o.quantity, 0), 0);
    UPDATE public.orders
    SET total_amount = d.proposed_amount,
        unit_price = CASE WHEN _qty IS NULL THEN unit_price ELSE ROUND(d.proposed_amount / _qty, 2) END,
        updated_at = now()
    WHERE id = d.order_id;
  END IF;

  UPDATE public.order_value_disputes
  SET status = CASE WHEN _approve THEN 'aprobada' ELSE 'rechazada' END,
      resolved_by = auth.uid(),
      resolved_by_name = _name,
      resolution_note = _note,
      resolved_at = now()
  WHERE id = _dispute_id;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    d.requested_by,
    CASE WHEN _approve THEN 'Corrección de valor aprobada' ELSE 'Corrección de valor rechazada' END,
    'Pedido ' || COALESCE((SELECT order_code FROM public.orders WHERE id = d.order_id), '')
      || ': valor propuesto ' || d.proposed_amount::text
      || COALESCE(' — ' || _note, ''),
    'info'
  );

  RETURN jsonb_build_object('ok', true, 'approved', _approve);
END;
$$;