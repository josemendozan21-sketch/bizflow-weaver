CREATE POLICY "Logistica uploads cod proofs" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-proofs' AND name LIKE 'cod/%' AND public.has_role(auth.uid(),'logistica'));

CREATE OR REPLACE FUNCTION public.register_cod_collection(_order_ids uuid[], _received boolean, _payment_date date, _reason text, _proof_url text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE o public.orders; nm text; newv text; bal numeric; n int := 0; total numeric := 0;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'logistica')) THEN
    RAISE EXCEPTION 'Solo Logística o administración pueden registrar cobros de contraentrega';
  END IF;
  IF NOT _received AND COALESCE(trim(_reason),'') = '' THEN RAISE EXCEPTION 'Indica el motivo'; END IF;
  IF _received AND _payment_date IS NULL THEN RAISE EXCEPTION 'Indica la fecha del cobro'; END IF;
  SELECT display_name INTO nm FROM public.profiles WHERE user_id = auth.uid();
  newv := CASE WHEN _received THEN 'cobrado' ELSE 'no_cobrado' END;
  FOR o IN SELECT * FROM public.orders WHERE id = ANY(_order_ids) FOR UPDATE LOOP
    IF o.payment_method IS DISTINCT FROM 'contra_entrega' THEN
      RAISE EXCEPTION 'El pedido % no es contraentrega', COALESCE(o.order_code, o.client_name);
    END IF;
    IF o.cod_confirmation IN ('cobrado','no_cobrado') THEN CONTINUE; END IF;
    bal := GREATEST(COALESCE(o.total_amount,0) - COALESCE(o.abono,0), 0);
    IF _received AND bal > 0 THEN
      INSERT INTO public.order_payments (order_id, amount, payment_date, proof_url, notes, method, recorded_by, recorded_by_name)
      VALUES (o.id, bal, _payment_date, _proof_url, 'Cobro contraentrega registrado por Logística' || COALESCE(' — ' || NULLIF(trim(_reason),''), ''), 'contra_entrega', auth.uid(), nm);
      total := total + bal;
    END IF;
    UPDATE public.orders SET cod_confirmation = newv, cod_confirmed_at = now(), cod_confirmed_by = auth.uid(),
      cod_confirmed_by_name = nm, cod_reason = NULLIF(trim(_reason),''), cod_proof_url = COALESCE(_proof_url, cod_proof_url),
      payment_complete = CASE WHEN _received THEN true ELSE payment_complete END,
      payment_date = CASE WHEN _received THEN _payment_date ELSE payment_date END
    WHERE id = o.id;
    INSERT INTO public.order_change_log (order_id, order_code, field, old_value, new_value, changed_by, changed_by_name, reason)
    VALUES (o.id, o.order_code, 'confirmacion_contraentrega', COALESCE(o.cod_confirmation,'—'), newv, auth.uid(), nm, _reason);
    n := n + 1;
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'updated', n, 'amount', total);
END $$;
REVOKE ALL ON FUNCTION public.register_cod_collection(uuid[], boolean, date, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.register_cod_collection(uuid[], boolean, date, text, text) TO authenticated;