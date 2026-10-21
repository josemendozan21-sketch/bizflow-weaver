ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cod_confirmation text,
  ADD COLUMN IF NOT EXISTS cod_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS cod_confirmed_by uuid,
  ADD COLUMN IF NOT EXISTS cod_confirmed_by_name text,
  ADD COLUMN IF NOT EXISTS cod_reason text,
  ADD COLUMN IF NOT EXISTS cod_proof_url text;

ALTER TABLE public.orders ADD CONSTRAINT orders_cod_confirmation_check
  CHECK (cod_confirmation IS NULL OR cod_confirmation IN ('pendiente','cobrado','no_cobrado'));

CREATE OR REPLACE FUNCTION public.request_cod_confirmation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.payment_method = 'contra_entrega'
     AND NEW.production_status IN ('despachado','entregado')
     AND COALESCE(OLD.production_status,'') NOT IN ('despachado','entregado')
     AND NEW.cod_confirmation IS NULL THEN
    NEW.cod_confirmation := 'pendiente';
    IF NEW.advisor_id IS NOT NULL THEN
      INSERT INTO public.notifications (target_role, target_user_id, title, message, type, reference_id)
      VALUES ('asesor_comercial', NEW.advisor_id, 'Confirma la entrega contraentrega',
        NEW.client_name || ' — pedido ' || COALESCE(NEW.order_code,'') || ' — valor a cobrar $' ||
        to_char(GREATEST(COALESCE(NEW.total_amount,0) - COALESCE(NEW.abono,0),0), 'FM999G999G999') ||
        '. Confirma si el cliente recibió y pagó para que sume a tu comisión.',
        'cod_confirmacion', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_request_cod_confirmation ON public.orders;
CREATE TRIGGER trg_request_cod_confirmation BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.request_cod_confirmation();

CREATE OR REPLACE FUNCTION public.confirm_cod_delivery(_order_id uuid, _received boolean, _reason text, _proof_url text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.orders; nm text; newv text;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido no encontrado'; END IF;
  IF NOT (o.advisor_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'contabilidad')) THEN
    RAISE EXCEPTION 'No tienes permiso para confirmar este pedido';
  END IF;
  IF o.payment_method IS DISTINCT FROM 'contra_entrega' THEN RAISE EXCEPTION 'El pedido no es contraentrega'; END IF;
  IF NOT _received AND COALESCE(trim(_reason),'') = '' THEN RAISE EXCEPTION 'Indica el motivo'; END IF;
  SELECT full_name INTO nm FROM public.profiles WHERE user_id = auth.uid();
  newv := CASE WHEN _received THEN 'cobrado' ELSE 'no_cobrado' END;
  UPDATE public.orders SET cod_confirmation = newv, cod_confirmed_at = now(), cod_confirmed_by = auth.uid(),
    cod_confirmed_by_name = nm, cod_reason = NULLIF(trim(_reason),''), cod_proof_url = COALESCE(_proof_url, cod_proof_url)
  WHERE id = _order_id;
  INSERT INTO public.order_change_log (order_id, order_code, field, old_value, new_value, changed_by, changed_by_name, reason)
  VALUES (_order_id, o.order_code, 'confirmacion_contraentrega', COALESCE(o.cod_confirmation,'—'), newv, auth.uid(), nm, _reason);
  RETURN jsonb_build_object('ok', true, 'status', newv);
END $$;

REVOKE ALL ON FUNCTION public.confirm_cod_delivery(uuid, boolean, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.confirm_cod_delivery(uuid, boolean, text, text) TO authenticated;