ALTER TABLE public.commission_payouts ADD COLUMN IF NOT EXISTS reconciliation_status text NOT NULL DEFAULT 'legacy_unreviewed', ADD COLUMN IF NOT EXISTS payment_kind text NOT NULL DEFAULT 'historico', ADD COLUMN IF NOT EXISTS request_key uuid, ADD COLUMN IF NOT EXISTS proof_hash text, ADD COLUMN IF NOT EXISTS confirmed_at timestamptz, ADD COLUMN IF NOT EXISTS reversed_at timestamptz;
CREATE UNIQUE INDEX commission_payout_request_key ON public.commission_payouts(request_key) WHERE request_key IS NOT NULL;
CREATE UNIQUE INDEX commission_payout_reference_active ON public.commission_payouts(lower(trim(reference))) WHERE nullif(trim(reference),'') IS NOT NULL AND reconciliation_status <> 'reversed' AND request_key IS NOT NULL;
CREATE UNIQUE INDEX commission_payout_proof_active ON public.commission_payouts(proof_hash) WHERE proof_hash IS NOT NULL AND reconciliation_status <> 'reversed';
CREATE TABLE public.commission_opening_balances (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), advisor_id uuid NOT NULL, pay_period text NOT NULL, amount numeric NOT NULL, note text NOT NULL, proof_url text NOT NULL, created_by uuid NOT NULL DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(advisor_id,pay_period), CONSTRAINT opening_amount_positive CHECK(amount > 0));
GRANT SELECT ON public.commission_opening_balances TO authenticated;
GRANT ALL ON public.commission_opening_balances TO service_role;
ALTER TABLE public.commission_opening_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY opening_read ON public.commission_opening_balances FOR SELECT TO authenticated USING (advisor_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contabilidad'));
CREATE TABLE public.commission_payment_allocations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payout_id uuid NOT NULL REFERENCES public.commission_payouts(id), settlement_item_id uuid REFERENCES public.commission_settlement_items(id), settlement_id uuid REFERENCES public.commission_settlements(id), opening_balance_id uuid REFERENCES public.commission_opening_balances(id), amount numeric NOT NULL, created_by uuid NOT NULL DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT allocation_positive CHECK(amount > 0), CONSTRAINT allocation_one_target CHECK(num_nonnulls(settlement_item_id,settlement_id,opening_balance_id)=1));
GRANT SELECT ON public.commission_payment_allocations TO authenticated;
GRANT ALL ON public.commission_payment_allocations TO service_role;
ALTER TABLE public.commission_payment_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY allocation_read ON public.commission_payment_allocations FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.commission_payouts p WHERE p.id=payout_id AND (p.advisor_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contabilidad'))));
CREATE TABLE public.commission_payment_audit (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payout_id uuid NOT NULL REFERENCES public.commission_payouts(id), action text NOT NULL, note text, actor_id uuid NOT NULL DEFAULT auth.uid(), actor_name text, details jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.commission_payment_audit TO authenticated;
GRANT ALL ON public.commission_payment_audit TO service_role;
ALTER TABLE public.commission_payment_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_audit_read ON public.commission_payment_audit FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.commission_payouts p WHERE p.id=payout_id AND (p.advisor_id=auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contabilidad'))));
REVOKE INSERT, UPDATE, DELETE ON public.commission_payouts FROM authenticated;

CREATE OR REPLACE FUNCTION public.manage_commission_payment(_payload jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.commission_payouts%ROWTYPE; s public.commission_settlements%ROWTYPE; i public.commission_settlement_items%ROWTYPE; b public.commission_opening_balances%ROWTYPE; a jsonb; target_id uuid; target_kind text; target_total numeric; allocated numeric; value numeric; payment_total numeric; pid uuid; aid uuid; op text; actor text; proof text; phash text; ref text; pp text; realdate date;
BEGIN
 IF auth.uid() IS NULL OR NOT(public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contabilidad')) THEN RAISE EXCEPTION 'No autorizado'; END IF;
 op:=_payload->>'operation';
 SELECT coalesce(display_name,auth.uid()::text) INTO actor FROM public.profiles WHERE id=auth.uid();
 -- Serialize mutations across payments, including different payouts targeting the same commission.
 PERFORM pg_advisory_xact_lock(7192142026);
 IF op='register' THEN
  SELECT * INTO p FROM public.commission_payouts WHERE request_key=(_payload->>'request_key')::uuid;
  IF FOUND THEN RETURN p.id; END IF;
  aid:=(_payload->>'advisor_id')::uuid;
  IF aid IS NULL OR aid IN ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003') OR NOT EXISTS(SELECT 1 FROM public.orders WHERE advisor_id=aid) THEN RAISE EXCEPTION 'Selecciona un asesor comercial válido'; END IF;
  payment_total:=(_payload->>'amount')::numeric;
  IF payment_total IS NULL OR payment_total<=0 OR payment_total<>round(payment_total,2) THEN RAISE EXCEPTION 'Importe inválido'; END IF;
  IF coalesce(_payload->>'payment_kind','') NOT IN ('historico','actual') THEN RAISE EXCEPTION 'Tipo de pago inválido'; END IF;
  IF nullif(_payload->>'request_key','') IS NULL THEN RAISE EXCEPTION 'Falta identificador del registro'; END IF;
 ELSE
  SELECT * INTO p FROM public.commission_payouts WHERE id=(_payload->>'payout_id')::uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pago no encontrado'; END IF;
  IF p.reconciliation_status='reversed' THEN RAISE EXCEPTION 'El pago está anulado'; END IF;
  pid:=p.id; aid:=p.advisor_id; payment_total:=p.amount;
 END IF;
 IF op='reverse' THEN
  IF coalesce(trim(_payload->>'note'),'')='' THEN RAISE EXCEPTION 'Escribe el motivo de la anulación'; END IF;
  UPDATE public.commission_payouts SET reconciliation_status='reversed',reversed_at=now() WHERE id=pid;
  INSERT INTO public.commission_payment_audit(payout_id,action,note,actor_id,actor_name,details) VALUES(pid,'anulado',_payload->>'note',auth.uid(),actor,to_jsonb(p));
  UPDATE public.commission_settlements SET status='pendiente_pago',confirmed_at=NULL,confirmed_by=NULL WHERE id IN (SELECT coalesce(a.settlement_id,it.settlement_id) FROM public.commission_payment_allocations a LEFT JOIN public.commission_settlement_items it ON it.id=a.settlement_item_id WHERE a.payout_id=pid);
  RETURN pid;
 END IF;
 IF op NOT IN ('register','reconcile') THEN RAISE EXCEPTION 'Acción inválida'; END IF;
 proof:=coalesce(nullif(trim(_payload->>'proof_url'),''),p.proof_url);
 phash:=coalesce(nullif(trim(_payload->>'proof_hash'),''),p.proof_hash);
 ref:=coalesce(nullif(trim(_payload->>'reference'),''),p.reference);
 pp:=coalesce(_payload->>'pay_period',p.pay_period);
 realdate:=coalesce((_payload->>'paid_at')::date,p.paid_at);
 IF proof IS NULL OR phash IS NULL OR phash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Adjunta el comprobante para confirmar'; END IF;
 IF proof NOT LIKE 'commissions/%' OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='payment-proofs' AND name=proof) THEN RAISE EXCEPTION 'El comprobante no está disponible'; END IF;
 IF pp IS NULL OR pp !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN RAISE EXCEPTION 'Período inválido'; END IF;
 IF realdate IS NULL OR realdate>current_date THEN RAISE EXCEPTION 'Fecha real de pago inválida'; END IF;
 IF EXISTS(SELECT 1 FROM public.commission_payouts WHERE id IS DISTINCT FROM pid AND reconciliation_status<>'reversed' AND (proof_hash=phash OR (ref IS NOT NULL AND lower(trim(reference))=lower(trim(ref))))) THEN RAISE EXCEPTION 'Este comprobante o referencia ya está registrado'; END IF;
 IF op='register' THEN
  INSERT INTO public.commission_payouts(advisor_id,pay_period,amount,paid_at,reference,proof_url,proof_hash,notes,registered_by,payment_kind,request_key,confirmed_at,reconciliation_status) VALUES(aid,pp,payment_total,realdate,ref,proof,phash,_payload->>'note',auth.uid(),_payload->>'payment_kind',(_payload->>'request_key')::uuid,now(),'pending') RETURNING id INTO pid;
 ELSE
  IF p.reconciliation_status='legacy_unreviewed' AND coalesce(trim(_payload->>'note'),'')='' THEN RAISE EXCEPTION 'Documenta la revisión del pago histórico'; END IF;
  UPDATE public.commission_payouts SET proof_url=proof,proof_hash=phash,reference=ref,pay_period=pp,paid_at=realdate,confirmed_at=coalesce(confirmed_at,now()),reconciliation_status='pending' WHERE id=pid;
 END IF;
 IF _payload ? 'opening_balance' THEN
  a:=_payload->'opening_balance';
  IF coalesce(trim(a->>'note'),'')='' OR (a->>'amount')::numeric<=0 OR (a->>'pay_period') !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' OR (a->>'amount') IS NULL OR (a->>'pay_period') IS NULL THEN RAISE EXCEPTION 'Saldo inicial: importe, período y evidencia obligatorios'; END IF;
  INSERT INTO public.commission_opening_balances(advisor_id,pay_period,amount,note,proof_url) VALUES(aid,a->>'pay_period',(a->>'amount')::numeric,a->>'note',proof) RETURNING id INTO target_id;
  _payload:=jsonb_set(_payload,'{allocations}',coalesce(_payload->'allocations','[]'::jsonb)||jsonb_build_array(jsonb_build_object('kind','opening','id',target_id,'amount',a->>'apply_amount')));
 END IF;
 FOR a IN SELECT * FROM jsonb_array_elements(coalesce(_payload->'allocations','[]'::jsonb)) LOOP
  target_id:=(a->>'id')::uuid; target_kind:=a->>'kind'; value:=(a->>'amount')::numeric;
  IF value IS NULL OR value<=0 OR value<>round(value,2) THEN RAISE EXCEPTION 'Asignación inválida'; END IF;
  IF target_kind='item' THEN
   SELECT * INTO i FROM public.commission_settlement_items WHERE id=target_id FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Comisión no encontrada'; END IF;
   SELECT * INTO s FROM public.commission_settlements WHERE id=i.settlement_id FOR UPDATE;
   IF s.advisor_id<>aid OR s.approved_at IS NULL OR s.status='en_revision' THEN RAISE EXCEPTION 'La comisión debe estar aprobada para este asesor'; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.orders o WHERE o.id=i.order_id AND o.advisor_id=aid AND o.production_status<>'cancelado' AND o.returned_at IS NULL AND (o.payment_complete OR o.abono>=o.total_amount) AND (nullif(o.payment_proof_url,'') IS NOT NULL OR EXISTS(SELECT 1 FROM public.order_payments op WHERE op.order_id=o.id AND nullif(op.proof_url,'') IS NOT NULL)) AND (o.cod_confirmation IS NULL OR o.cod_confirmation='cobrado')) THEN RAISE EXCEPTION 'El pedido no cumple los requisitos de comisión'; END IF;
   target_total:=i.amount;
  ELSIF target_kind='extra' THEN
   SELECT * INTO s FROM public.commission_settlements WHERE id=target_id FOR UPDATE;
   IF NOT FOUND OR s.advisor_id<>aid OR s.approved_at IS NULL OR s.status='en_revision' THEN RAISE EXCEPTION 'La liquidación debe estar aprobada para este asesor'; END IF;
   target_total:=greatest(s.bonus_amount+s.adjustment_amount,0);
  ELSIF target_kind='opening' THEN
   SELECT * INTO b FROM public.commission_opening_balances WHERE id=target_id FOR UPDATE;
   IF NOT FOUND OR b.advisor_id<>aid THEN RAISE EXCEPTION 'Saldo inicial no válido para este asesor'; END IF;
   target_total:=b.amount;
  ELSE RAISE EXCEPTION 'Destino de conciliación inválido'; END IF;
  SELECT coalesce(sum(x.amount),0) INTO allocated FROM public.commission_payment_allocations x JOIN public.commission_payouts px ON px.id=x.payout_id WHERE px.reconciliation_status NOT IN ('reversed','legacy_unreviewed') AND (CASE target_kind WHEN 'item' THEN x.settlement_item_id=target_id WHEN 'extra' THEN x.settlement_id=target_id ELSE x.opening_balance_id=target_id END);
  IF allocated+value>target_total THEN RAISE EXCEPTION 'La asignación supera el saldo pendiente de la comisión'; END IF;
  SELECT coalesce(sum(amount),0) INTO allocated FROM public.commission_payment_allocations WHERE payout_id=pid;
  IF allocated+value>payment_total THEN RAISE EXCEPTION 'La suma asignada supera el importe del pago'; END IF;
  INSERT INTO public.commission_payment_allocations(payout_id,settlement_item_id,settlement_id,opening_balance_id,amount) VALUES(pid,CASE WHEN target_kind='item' THEN target_id END,CASE WHEN target_kind='extra' THEN target_id END,CASE WHEN target_kind='opening' THEN target_id END,value);
 END LOOP;
 SELECT coalesce(sum(amount),0) INTO allocated FROM public.commission_payment_allocations WHERE payout_id=pid;
 UPDATE public.commission_payouts SET reconciliation_status=CASE WHEN allocated=payment_total THEN 'reconciled' WHEN allocated>0 THEN 'partial' ELSE 'pending' END WHERE id=pid;
 INSERT INTO public.commission_payment_audit(payout_id,action,note,actor_id,actor_name,details) VALUES(pid,CASE WHEN op='register' THEN 'registrado' ELSE 'conciliado' END,_payload->>'note',auth.uid(),actor,jsonb_build_object('previous',CASE WHEN op='reconcile' THEN to_jsonb(p) END,'request',_payload,'applied_total',allocated));
 UPDATE public.commission_settlements SET status='pago_registrado',confirmed_at=NULL,confirmed_by=NULL WHERE id IN (SELECT coalesce(x.settlement_id,it.settlement_id) FROM public.commission_payment_allocations x LEFT JOIN public.commission_settlement_items it ON it.id=x.settlement_item_id WHERE x.payout_id=pid);
 RETURN pid;
END $$;
REVOKE ALL ON FUNCTION public.manage_commission_payment(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_commission_payment(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_commission_snapshot() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(7192142026);
 IF TG_TABLE_NAME='commission_settlement_items' THEN
  IF EXISTS(SELECT 1 FROM public.commission_payment_allocations WHERE settlement_item_id=OLD.id) THEN RAISE EXCEPTION 'El detalle tiene pagos conciliados; no se puede recalcular ni eliminar'; END IF;
 ELSE
  IF TG_OP='DELETE' AND EXISTS(SELECT 1 FROM public.commission_payment_allocations a LEFT JOIN public.commission_settlement_items i ON i.id=a.settlement_item_id WHERE coalesce(a.settlement_id,i.settlement_id)=OLD.id) THEN RAISE EXCEPTION 'La liquidación tiene historial de pagos'; END IF;
  IF TG_OP='UPDATE' AND (NEW.total_amount<>OLD.total_amount OR NEW.bonus_amount<>OLD.bonus_amount OR NEW.adjustment_amount<>OLD.adjustment_amount) AND EXISTS(SELECT 1 FROM public.commission_payment_allocations a LEFT JOIN public.commission_settlement_items i ON i.id=a.settlement_item_id WHERE coalesce(a.settlement_id,i.settlement_id)=OLD.id) THEN RAISE EXCEPTION 'La liquidación conciliada no se puede recalcular'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER protect_paid_commission_item BEFORE UPDATE OR DELETE ON public.commission_settlement_items FOR EACH ROW EXECUTE FUNCTION public.protect_commission_snapshot();
CREATE TRIGGER protect_paid_commission_settlement BEFORE UPDATE OR DELETE ON public.commission_settlements FOR EACH ROW EXECUTE FUNCTION public.protect_commission_snapshot();

CREATE OR REPLACE FUNCTION public.advisor_respond_settlement(_settlement_id uuid,_confirm boolean,_note text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.commission_settlements%ROWTYPE; paid numeric; BEGIN
 PERFORM pg_advisory_xact_lock(7192142026);
 SELECT * INTO s FROM public.commission_settlements WHERE id=_settlement_id FOR UPDATE;
 IF NOT FOUND OR s.advisor_id<>auth.uid() THEN RAISE EXCEPTION 'No autorizado'; END IF;
 SELECT coalesce(sum(a.amount),0) INTO paid FROM public.commission_payment_allocations a JOIN public.commission_payouts p ON p.id=a.payout_id LEFT JOIN public.commission_settlement_items i ON i.id=a.settlement_item_id WHERE coalesce(a.settlement_id,i.settlement_id)=s.id AND p.reconciliation_status NOT IN ('legacy_unreviewed','reversed');
 IF _confirm THEN
  IF paid<=0 THEN RAISE EXCEPTION 'Aún no hay pagos conciliados'; END IF;
  UPDATE public.commission_settlements SET confirmed_by=auth.uid(),confirmed_at=now(),dispute_note=NULL,status=CASE WHEN paid>=total_amount THEN 'saldado' ELSE 'pago_registrado' END WHERE id=s.id;
 ELSE
  IF coalesce(trim(_note),'')='' THEN RAISE EXCEPTION 'Describe la diferencia'; END IF;
  UPDATE public.commission_settlements SET status='en_revision',dispute_note=_note,disputed_at=now() WHERE id=s.id;
 END IF;
 INSERT INTO public.commission_settlement_log(settlement_id,action,note,amount,actor_id) VALUES(s.id,CASE WHEN _confirm THEN 'confirmado_asesor' ELSE 'diferencia_reportada' END,_note,paid,auth.uid());
 RETURN jsonb_build_object('ok',true);
END $$;