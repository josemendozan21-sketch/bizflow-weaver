CREATE OR REPLACE FUNCTION public.guard_approved_commission_snapshot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE parent_id uuid; approved boolean;
BEGIN
 PERFORM pg_advisory_xact_lock(7192142026);
 IF TG_TABLE_NAME='commission_settlements' THEN
  approved := OLD.approved_at IS NOT NULL OR OLD.status IN ('pendiente_pago','pago_registrado','saldado');
  IF approved AND TG_OP='DELETE' THEN RAISE EXCEPTION 'La liquidación aprobada no se puede eliminar'; END IF;
  IF approved AND TG_OP='UPDATE' AND ROW(NEW.advisor_id,NEW.advisor_name,NEW.pay_period,NEW.current_amount,NEW.carryover_amount,NEW.bonus_amount,NEW.adjustment_amount,NEW.total_amount,NEW.notes,NEW.approved_by,NEW.approved_at,NEW.created_at) IS DISTINCT FROM ROW(OLD.advisor_id,OLD.advisor_name,OLD.pay_period,OLD.current_amount,OLD.carryover_amount,OLD.bonus_amount,OLD.adjustment_amount,OLD.total_amount,OLD.notes,OLD.approved_by,OLD.approved_at,OLD.created_at) THEN RAISE EXCEPTION 'La liquidación aprobada conserva sus importes y tarifas originales'; END IF;
 ELSE
  IF TG_OP='INSERT' THEN parent_id:=NEW.settlement_id; ELSE parent_id:=OLD.settlement_id; END IF;
  SELECT approved_at IS NOT NULL OR status IN ('pendiente_pago','pago_registrado','saldado') INTO approved FROM public.commission_settlements WHERE id=parent_id;
  IF coalesce(approved,false) THEN RAISE EXCEPTION 'No se pueden sustituir ni agregar partidas de una liquidación aprobada'; END IF;
  IF TG_OP='UPDATE' AND NEW.settlement_id IS DISTINCT FROM OLD.settlement_id AND EXISTS(SELECT 1 FROM public.commission_settlements WHERE id=NEW.settlement_id AND (approved_at IS NOT NULL OR status IN ('pendiente_pago','pago_registrado','saldado'))) THEN RAISE EXCEPTION 'No se pueden trasladar partidas a una liquidación aprobada'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;