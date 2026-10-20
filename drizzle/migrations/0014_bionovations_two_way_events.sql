CREATE TABLE public.external_order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  order_id uuid,
  external_order_id text NOT NULL,
  kind text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pendiente',
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.external_order_events TO authenticated;
GRANT ALL ON public.external_order_events TO service_role;
ALTER TABLE public.external_order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins ven eventos externos" ON public.external_order_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_ext_events_pending ON public.external_order_events (status, next_attempt_at);

CREATE TABLE public.order_balance_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  external_order_id text NOT NULL,
  external_payment_id text NOT NULL UNIQUE,
  method text,
  amount numeric NOT NULL CHECK (amount > 0),
  proof_url text,
  payment_reference text,
  status text NOT NULL DEFAULT 'por_revisar' CHECK (status IN ('por_revisar','aprobado','rechazado')),
  reason text,
  reviewed_by uuid,
  reviewed_by_name text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_balance_payments TO authenticated;
GRANT ALL ON public.order_balance_payments TO service_role;
ALTER TABLE public.order_balance_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Revisores ven pagos de saldo" ON public.order_balance_payments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'contabilidad')
         OR public.has_role(auth.uid(), 'logistica') OR public.has_role(auth.uid(), 'asesor_comercial'));
CREATE INDEX idx_balance_payments_order ON public.order_balance_payments (order_id);

CREATE OR REPLACE FUNCTION public.enqueue_external_order_event(_order_id uuid, _kind text, _payload jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE o record; ev uuid := gen_random_uuid(); ext text;
BEGIN
  SELECT id, external_order_id, advisor_id INTO o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND OR o.external_order_id IS NULL
     OR o.advisor_id <> '00000000-0000-0000-0000-000000000003'::uuid THEN
    RETURN;
  END IF;
  ext := split_part(o.external_order_id, '#', 1);
  INSERT INTO public.external_order_events (event_id, order_id, external_order_id, kind, payload)
  VALUES (ev, _order_id, ext, _kind,
    jsonb_strip_nulls(_payload || jsonb_build_object('external_order_id', ext, 'event_id', ev, 'kind', _kind)));
END $$;
REVOKE ALL ON FUNCTION public.enqueue_external_order_event(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_ext_event_orders() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.production_status IS DISTINCT FROM OLD.production_status THEN
    PERFORM public.enqueue_external_order_event(NEW.id, 'stage',
      jsonb_build_object('stage', NEW.production_status,
        'message', NEW.product || ' — ' || COALESCE(NEW.order_code, '')));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_ext_event_orders AFTER UPDATE OF production_status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_ext_event_orders();

CREATE OR REPLACE FUNCTION public.trg_ext_event_logo() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.order_id IS NULL OR NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  PERFORM public.enqueue_external_order_event(NEW.order_id, 'stage',
    jsonb_build_object('stage', 'logo_' || NEW.status::text, 'message', NEW.design_notes));
  IF NEW.status::text = 'listo_aprobacion' THEN
    PERFORM public.enqueue_external_order_event(NEW.order_id, 'approval_request',
      jsonb_build_object('action_type', 'logo_design',
        'attachment_url', COALESCE(NEW.adjusted_logo_url, NEW.original_logo_url),
        'message', NEW.design_notes));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_ext_event_logo AFTER UPDATE OF status ON public.logo_requests
  FOR EACH ROW EXECUTE FUNCTION public.trg_ext_event_logo();

CREATE OR REPLACE FUNCTION public.trg_ext_event_production() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.order_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.current_stage IS DISTINCT FROM OLD.current_stage THEN
    PERFORM public.enqueue_external_order_event(NEW.order_id, 'stage',
      jsonb_build_object('stage', NEW.current_stage));
  END IF;
  IF NEW.stamp_size_photo_url IS NOT NULL AND NEW.stamp_size_photo_url IS DISTINCT FROM OLD.stamp_size_photo_url THEN
    PERFORM public.enqueue_external_order_event(NEW.order_id, 'approval_request',
      jsonb_build_object('action_type', 'stamp_size', 'attachment_url', NEW.stamp_size_photo_url,
        'message', 'Foto de tamaño del estampado lista para aprobar'));
  END IF;
  IF NEW.stamp_inkgel_photo_url IS NOT NULL AND NEW.stamp_inkgel_photo_url IS DISTINCT FROM OLD.stamp_inkgel_photo_url THEN
    PERFORM public.enqueue_external_order_event(NEW.order_id, 'approval_request',
      jsonb_build_object('action_type', 'stamp_inkgel', 'attachment_url', NEW.stamp_inkgel_photo_url,
        'message', 'Foto de tinta y gel lista para aprobar'));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_ext_event_production AFTER UPDATE ON public.production_orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_ext_event_production();

CREATE OR REPLACE FUNCTION public.wake_order_event_dispatcher() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://auncgjkpwajfbvcckuny.supabase.co/functions/v1/dispatch-order-events',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bmNnamtwd2FqZmJ2Y2NrdW55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2OTA4ODAsImV4cCI6MjA5MTI2Njg4MH0.btnJ7sdEq8UhiC1E8s_nINCoDnhWHPOqmdnFivAIc0Y'),
    body := '{}'::jsonb);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.trg_ext_event_wake() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.wake_order_event_dispatcher();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_ext_event_wake AFTER INSERT ON public.external_order_events
  FOR EACH ROW EXECUTE FUNCTION public.trg_ext_event_wake();

CREATE OR REPLACE FUNCTION public.apply_balance_payment(_id uuid, _by_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE bp record; ln record; remaining numeric; part numeric; last_id uuid;
BEGIN
  SELECT * INTO bp FROM public.order_balance_payments WHERE id = _id;
  remaining := bp.amount;
  FOR ln IN
    SELECT id, COALESCE(total_amount,0) - COALESCE(abono,0) AS due
    FROM public.orders
    WHERE advisor_id = '00000000-0000-0000-0000-000000000003'::uuid
      AND split_part(external_order_id, '#', 1) = bp.external_order_id
    ORDER BY line_index NULLS FIRST
  LOOP
    last_id := ln.id;
    EXIT WHEN remaining <= 0;
    part := LEAST(remaining, GREATEST(ln.due, 0));
    IF part > 0 THEN
      INSERT INTO public.order_payments (order_id, amount, method, proof_url, notes, recorded_by_name)
      VALUES (ln.id, part, bp.method, bp.proof_url,
        'Pago de saldo web ' || bp.external_payment_id || COALESCE(' · ref ' || bp.payment_reference, ''), _by_name);
      remaining := remaining - part;
    END IF;
  END LOOP;
  IF remaining > 0 AND last_id IS NOT NULL THEN
    INSERT INTO public.order_payments (order_id, amount, method, proof_url, notes, recorded_by_name)
    VALUES (last_id, remaining, bp.method, bp.proof_url,
      'Pago de saldo web ' || bp.external_payment_id || ' (excedente)', _by_name);
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.apply_balance_payment(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_balance_payment(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.review_balance_payment(_id uuid, _approve boolean, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE bp record; who text;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'contabilidad')) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Sin permiso para revisar pagos');
  END IF;
  SELECT * INTO bp FROM public.order_balance_payments WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Pago no encontrado'); END IF;
  IF bp.status <> 'por_revisar' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Este pago ya fue revisado');
  END IF;
  IF NOT _approve AND COALESCE(btrim(_reason), '') = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Escribe el motivo del rechazo');
  END IF;
  SELECT COALESCE(display_name, email) INTO who FROM public.profiles WHERE user_id = auth.uid();
  UPDATE public.order_balance_payments
    SET status = CASE WHEN _approve THEN 'aprobado' ELSE 'rechazado' END,
        reason = NULLIF(btrim(_reason), ''), reviewed_by = auth.uid(), reviewed_by_name = who,
        reviewed_at = now(), updated_at = now()
    WHERE id = _id;
  IF _approve THEN PERFORM public.apply_balance_payment(_id, who); END IF;
  PERFORM public.enqueue_external_order_event(bp.order_id, 'balance_review',
    jsonb_build_object('balance_payment_id', bp.external_payment_id,
      'balance_status', CASE WHEN _approve THEN 'aprobado' ELSE 'rechazado' END,
      'reason', NULLIF(btrim(_reason), '')));
  RETURN jsonb_build_object('success', true);
END $$;
REVOKE ALL ON FUNCTION public.review_balance_payment(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_balance_payment(uuid, boolean, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.enforce_payment_before_dispatch()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE
  v_becomes_dispatched boolean;
BEGIN
  IF NEW.sale_type IS DISTINCT FROM 'mayor' THEN
    RETURN NEW;
  END IF;

  v_becomes_dispatched :=
    (NEW.production_status IN ('despachado','entregado')
      AND COALESCE(OLD.production_status, '') NOT IN ('despachado','entregado'))
    OR (NEW.dispatched_at IS NOT NULL AND OLD.dispatched_at IS NULL);

  IF v_becomes_dispatched
     AND NEW.advisor_id = '00000000-0000-0000-0000-000000000003'::uuid
     AND NEW.external_order_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.order_balance_payments p
                 WHERE p.external_order_id = split_part(NEW.external_order_id, '#', 1)
                   AND p.status = 'por_revisar') THEN
    RAISE EXCEPTION 'El pedido % no puede despacharse: hay un comprobante de saldo por revisar',
      COALESCE(NEW.order_code, NEW.id::text);
  END IF;

  IF COALESCE(NEW.is_credit, false)
     AND NEW.advisor_id IS DISTINCT FROM '00000000-0000-0000-0000-000000000003'::uuid THEN
    RETURN NEW;
  END IF;

  IF v_becomes_dispatched
     AND COALESCE(NEW.abono, 0) < COALESCE(NEW.total_amount, 0) THEN
    RAISE EXCEPTION 'El pedido % no puede despacharse: tiene saldo pendiente de $%',
      COALESCE(NEW.order_code, NEW.id::text),
      to_char(COALESCE(NEW.total_amount,0) - COALESCE(NEW.abono,0), 'FM999G999G999');
  END IF;

  RETURN NEW;
END;
$function$;

SELECT cron.schedule('retry-order-events', '0 * * * *', $cron$
  SELECT public.wake_order_event_dispatcher()
  WHERE EXISTS (SELECT 1 FROM public.external_order_events WHERE status = 'pendiente' AND next_attempt_at <= now());
$cron$);