ALTER TABLE public.order_value_disputes
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'valor';

ALTER TABLE public.order_value_disputes
  DROP CONSTRAINT IF EXISTS order_value_disputes_kind_check;
ALTER TABLE public.order_value_disputes
  ADD CONSTRAINT order_value_disputes_kind_check CHECK (kind IN ('valor','pago'));

CREATE OR REPLACE FUNCTION public.resolve_order_value_dispute(_dispute_id uuid, _approve boolean, _note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  d public.order_value_disputes%ROWTYPE;
  o public.orders%ROWTYPE;
  _name text;
  _qty numeric;
  _registered numeric;
  _missing numeric;
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

    IF COALESCE(d.kind, 'valor') = 'pago' THEN
      SELECT COALESCE(SUM(amount), 0) INTO _registered
      FROM public.order_payments WHERE order_id = d.order_id;

      _missing := GREATEST(COALESCE(d.proposed_amount, 0) - _registered, 0);

      IF _missing > 0 THEN
        INSERT INTO public.order_payments (order_id, amount, payment_date, proof_url, notes, recorded_by, recorded_by_name)
        VALUES (
          d.order_id,
          _missing,
          CURRENT_DATE,
          COALESCE(d.evidence_url, o.payment_proof_url),
          'Pago confirmado por el asesor y aprobado por Contabilidad' || COALESCE(' — ' || d.reason, ''),
          auth.uid(),
          _name
        );
      END IF;

      UPDATE public.orders
      SET abono = GREATEST(COALESCE(abono, 0), COALESCE(d.proposed_amount, 0)),
          payment_complete = (COALESCE(d.proposed_amount, 0) >= COALESCE(total_amount, 0)),
          updated_at = now()
      WHERE id = d.order_id;
    ELSE
      _qty := NULLIF(COALESCE(o.quantity, 0), 0);
      UPDATE public.orders
      SET total_amount = d.proposed_amount,
          unit_price = CASE WHEN _qty IS NULL THEN unit_price ELSE ROUND(d.proposed_amount / _qty, 2) END,
          updated_at = now()
      WHERE id = d.order_id;
    END IF;
  END IF;

  UPDATE public.order_value_disputes
  SET status = CASE WHEN _approve THEN 'aprobada' ELSE 'rechazada' END,
      resolved_by = auth.uid(),
      resolved_by_name = _name,
      resolution_note = _note,
      resolved_at = now()
  WHERE id = _dispute_id;

  INSERT INTO public.notifications (target_role, target_user_id, title, message, type, reference_id)
  VALUES (
    'asesor_comercial',
    d.requested_by,
    CASE
      WHEN COALESCE(d.kind,'valor') = 'pago' THEN
        CASE WHEN _approve THEN 'Confirmación de pago aprobada' ELSE 'Confirmación de pago rechazada' END
      ELSE
        CASE WHEN _approve THEN 'Corrección de valor aprobada' ELSE 'Corrección de valor rechazada' END
    END,
    'Pedido ' || COALESCE((SELECT order_code FROM public.orders WHERE id = d.order_id), '')
      || ': valor propuesto $' || to_char(d.proposed_amount, 'FM999G999G999')
      || COALESCE(' — ' || _note, ''),
    CASE WHEN _approve THEN 'success' ELSE 'warning' END,
    d.order_id
  );

  RETURN jsonb_build_object('ok', true, 'approved', _approve, 'kind', COALESCE(d.kind,'valor'));
END;
$function$;