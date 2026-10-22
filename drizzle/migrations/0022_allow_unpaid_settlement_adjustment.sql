CREATE OR REPLACE FUNCTION public.guard_approved_commission_snapshot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE parent_id uuid; approved boolean;
BEGIN
 PERFORM pg_advisory_xact_lock(7192142026);
 IF TG_TABLE_NAME='commission_settlements' THEN
  approved := OLD.approved_at IS NOT NULL OR OLD.status IN ('pendiente_pago','pago_registrado','saldado');
  IF approved AND TG_OP='DELETE' THEN RAISE EXCEPTION 'La liquidación aprobada no se puede eliminar'; END IF;
  IF approved AND TG_OP='UPDATE' AND ROW(NEW.advisor_id,NEW.advisor_name,NEW.pay_period,NEW.current_amount,NEW.carryover_amount,NEW.bonus_amount,NEW.approved_by,NEW.approved_at,NEW.created_at) IS DISTINCT FROM ROW(OLD.advisor_id,OLD.advisor_name,OLD.pay_period,OLD.current_amount,OLD.carryover_amount,OLD.bonus_amount,OLD.approved_by,OLD.approved_at,OLD.created_at) THEN RAISE EXCEPTION 'La liquidación aprobada conserva sus importes y tarifas originales'; END IF;
  IF approved AND TG_OP='UPDATE' AND ROW(NEW.adjustment_amount,NEW.total_amount,NEW.notes) IS DISTINCT FROM ROW(OLD.adjustment_amount,OLD.total_amount,OLD.notes)
     AND coalesce(current_setting('app.commission_adjust',true),'')<>'on' THEN RAISE EXCEPTION 'La liquidación aprobada conserva sus importes y tarifas originales'; END IF;
 ELSE
  IF TG_OP='INSERT' THEN parent_id:=NEW.settlement_id; ELSE parent_id:=OLD.settlement_id; END IF;
  SELECT approved_at IS NOT NULL OR status IN ('pendiente_pago','pago_registrado','saldado') INTO approved FROM public.commission_settlements WHERE id=parent_id;
  IF coalesce(approved,false) THEN RAISE EXCEPTION 'No se pueden sustituir ni agregar partidas de una liquidación aprobada'; END IF;
  IF TG_OP='UPDATE' AND NEW.settlement_id IS DISTINCT FROM OLD.settlement_id AND EXISTS(SELECT 1 FROM public.commission_settlements WHERE id=NEW.settlement_id AND (approved_at IS NOT NULL OR status IN ('pendiente_pago','pago_registrado','saldado'))) THEN RAISE EXCEPTION 'No se pueden trasladar partidas a una liquidación aprobada'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.adjust_commission_settlement(_settlement_id uuid, _adjustment numeric, _notes text, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.commission_settlements; who text;
BEGIN
 IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contabilidad')) THEN RAISE EXCEPTION 'Solo Contabilidad puede ajustar liquidaciones'; END IF;
 IF coalesce(trim(_reason),'')='' THEN RAISE EXCEPTION 'Indica el motivo del ajuste'; END IF;
 SELECT * INTO s FROM public.commission_settlements WHERE id=_settlement_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Liquidación no encontrada'; END IF;
 IF s.status='saldado' THEN RAISE EXCEPTION 'La liquidación ya está saldada'; END IF;
 IF EXISTS(SELECT 1 FROM public.commission_payouts p WHERE p.settlement_id=_settlement_id AND p.reconciliation_status NOT IN ('anulado','reversado'))
    OR EXISTS(SELECT 1 FROM public.commission_payment_allocations a WHERE a.settlement_id=_settlement_id) THEN
   RAISE EXCEPTION 'La liquidación ya tiene pagos; corrige con un ajuste en la siguiente liquidación'; END IF;
 PERFORM set_config('app.commission_adjust','on',true);
 UPDATE public.commission_settlements SET adjustment_amount=round(_adjustment),
   total_amount=s.total_amount - s.adjustment_amount + round(_adjustment), notes=nullif(_notes,'') WHERE id=_settlement_id;
 PERFORM set_config('app.commission_adjust','off',true);
 SELECT email INTO who FROM auth.users WHERE id=auth.uid();
 INSERT INTO public.commission_settlement_log(settlement_id,action,note,amount,actor_name)
 VALUES(_settlement_id,'ajuste_corregido',_reason||' (antes '||s.adjustment_amount||')',round(_adjustment),who);
END $$;
GRANT EXECUTE ON FUNCTION public.adjust_commission_settlement(uuid,numeric,text,text) TO authenticated;