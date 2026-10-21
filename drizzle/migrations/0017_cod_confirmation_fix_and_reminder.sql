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
  SELECT display_name INTO nm FROM public.profiles WHERE user_id = auth.uid();
  newv := CASE WHEN _received THEN 'cobrado' ELSE 'no_cobrado' END;
  UPDATE public.orders SET cod_confirmation = newv, cod_confirmed_at = now(), cod_confirmed_by = auth.uid(),
    cod_confirmed_by_name = nm, cod_reason = NULLIF(trim(_reason),''), cod_proof_url = COALESCE(_proof_url, cod_proof_url)
  WHERE id = _order_id;
  INSERT INTO public.order_change_log (order_id, order_code, field, old_value, new_value, changed_by, changed_by_name, reason)
  VALUES (_order_id, o.order_code, 'confirmacion_contraentrega', COALESCE(o.cod_confirmation,'—'), newv, auth.uid(), nm, _reason);
  RETURN jsonb_build_object('ok', true, 'status', newv);
END $$;

CREATE OR REPLACE FUNCTION public.remind_pending_cod_confirmations()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n integer := 0;
BEGIN
  FOR r IN SELECT id, advisor_id, advisor_name, client_name, order_code FROM public.orders
    WHERE cod_confirmation = 'pendiente' AND dispatched_at IS NOT NULL AND dispatched_at < now() - interval '7 days'
      AND NOT EXISTS (SELECT 1 FROM public.notifications nt WHERE nt.reference_id = orders.id AND nt.type = 'cod_recordatorio' AND nt.created_at > now() - interval '7 days')
  LOOP
    IF r.advisor_id IS NOT NULL THEN
      INSERT INTO public.notifications (target_role, target_user_id, title, message, type, reference_id)
      VALUES ('asesor_comercial', r.advisor_id, 'Recordatorio: confirma la contraentrega', r.client_name || ' — pedido ' || COALESCE(r.order_code,'') || ' lleva más de 7 días sin confirmar.', 'cod_recordatorio', r.id);
    END IF;
    INSERT INTO public.notifications (target_role, title, message, type, reference_id)
    VALUES ('contabilidad', 'Contraentrega sin confirmar', r.client_name || ' — pedido ' || COALESCE(r.order_code,'') || ' (asesor: ' || COALESCE(r.advisor_name,'—') || ') lleva más de 7 días sin confirmar.', 'cod_recordatorio', r.id);
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.remind_pending_cod_confirmations() FROM public, anon, authenticated;

DO $$ BEGIN
  PERFORM cron.schedule('cod-confirmation-reminder', '0 14 * * *', 'select public.remind_pending_cod_confirmations()');
EXCEPTION WHEN others THEN NULL; END $$;