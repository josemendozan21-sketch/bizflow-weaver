CREATE OR REPLACE FUNCTION public.guard_approved_commission_snapshot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE parent_id uuid; approved boolean;
BEGIN
 PERFORM pg_advisory_xact_lock(7192142026);
 IF TG_TABLE_NAME='commission_settlements' THEN
  approved := OLD.approved_at IS NOT NULL OR OLD.status IN ('pendiente_pago','pago_registrado','saldado');
  IF approved AND (TG_OP='DELETE' OR (to_jsonb(NEW)-ARRAY['status','returned_note','confirmed_at','dispute_note','updated_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','returned_note','confirmed_at','dispute_note','updated_at'])) THEN
   RAISE EXCEPTION 'La liquidación aprobada conserva sus importes y tarifas originales';
  END IF;
 ELSE
  IF TG_OP='INSERT' THEN parent_id:=NEW.settlement_id; ELSE parent_id:=OLD.settlement_id; END IF;
  SELECT approved_at IS NOT NULL OR status IN ('pendiente_pago','pago_registrado','saldado') INTO approved FROM public.commission_settlements WHERE id=parent_id;
  IF coalesce(approved,false) THEN RAISE EXCEPTION 'No se pueden sustituir ni agregar partidas de una liquidación aprobada'; END IF;
  IF TG_OP='UPDATE' AND NEW.settlement_id IS DISTINCT FROM OLD.settlement_id AND EXISTS(SELECT 1 FROM public.commission_settlements WHERE id=NEW.settlement_id AND (approved_at IS NOT NULL OR status IN ('pendiente_pago','pago_registrado','saldado'))) THEN RAISE EXCEPTION 'No se pueden trasladar partidas a una liquidación aprobada'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_approved_settlement BEFORE UPDATE OR DELETE ON public.commission_settlements FOR EACH ROW EXECUTE FUNCTION public.guard_approved_commission_snapshot();
CREATE TRIGGER guard_approved_settlement_item BEFORE INSERT OR UPDATE OR DELETE ON public.commission_settlement_items FOR EACH ROW EXECUTE FUNCTION public.guard_approved_commission_snapshot();

CREATE OR REPLACE FUNCTION public.approve_commission_settlement(_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sid uuid; previous public.commission_settlements; row_data jsonb; item jsonb; actor text;
BEGIN
 IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contabilidad')) THEN RAISE EXCEPTION 'Solo Contabilidad puede aprobar liquidaciones'; END IF;
 PERFORM pg_advisory_xact_lock(7192142026);
 row_data:=_payload->'settlement';
 sid:=nullif(_payload->>'existing_id','')::uuid;
 IF sid IS NOT NULL THEN
  SELECT * INTO previous FROM public.commission_settlements WHERE id=sid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Liquidación no encontrada'; END IF;
  IF previous.approved_at IS NOT NULL OR previous.status IN ('pendiente_pago','pago_registrado','saldado') THEN RAISE EXCEPTION 'La liquidación ya fue aprobada y no se puede recalcular'; END IF;
  IF previous.advisor_id IS DISTINCT FROM (row_data->>'advisor_id')::uuid OR previous.pay_period IS DISTINCT FROM row_data->>'pay_period' THEN RAISE EXCEPTION 'El asesor y período no corresponden a la liquidación'; END IF;
  DELETE FROM public.commission_settlement_items WHERE settlement_id=sid;
  UPDATE public.commission_settlements SET advisor_name=row_data->>'advisor_name', current_amount=(row_data->>'current_amount')::numeric, carryover_amount=(row_data->>'carryover_amount')::numeric, bonus_amount=(row_data->>'bonus_amount')::numeric, adjustment_amount=(row_data->>'adjustment_amount')::numeric, total_amount=(row_data->>'total_amount')::numeric, notes=nullif(row_data->>'notes','') WHERE id=sid;
 ELSE
  INSERT INTO public.commission_settlements(advisor_id,advisor_name,pay_period,status,current_amount,carryover_amount,bonus_amount,adjustment_amount,total_amount,notes)
  VALUES((row_data->>'advisor_id')::uuid,row_data->>'advisor_name',row_data->>'pay_period','pendiente_liquidacion',(row_data->>'current_amount')::numeric,(row_data->>'carryover_amount')::numeric,(row_data->>'bonus_amount')::numeric,(row_data->>'adjustment_amount')::numeric,(row_data->>'total_amount')::numeric,nullif(row_data->>'notes','')) RETURNING id INTO sid;
 END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(coalesce(_payload->'items','[]'::jsonb)) LOOP
  IF NOT EXISTS(SELECT 1 FROM public.orders WHERE id=(item->>'order_id')::uuid AND advisor_id=(row_data->>'advisor_id')::uuid) THEN RAISE EXCEPTION 'El pedido no pertenece al asesor'; END IF;
  INSERT INTO public.commission_settlement_items(settlement_id,order_id,order_code,client_name,sale_date,completed_date,paid_date,causation_period,base_amount,rate,amount,is_carryover)
  VALUES(sid,(item->>'order_id')::uuid,item->>'order_code',item->>'client_name',(item->>'sale_date')::date,(item->>'completed_date')::date,(item->>'paid_date')::date,item->>'causation_period',(item->>'base_amount')::numeric,(item->>'rate')::numeric,(item->>'amount')::numeric,(item->>'is_carryover')::boolean);
 END LOOP;
 UPDATE public.commission_settlements SET status='pendiente_pago', approved_by=auth.uid(),approved_at=now(),returned_note=NULL WHERE id=sid;
 SELECT display_name INTO actor FROM public.profiles WHERE user_id=auth.uid();
 INSERT INTO public.commission_settlement_log(settlement_id,action,note,amount,actor_name) VALUES(sid,'aprobada',nullif(row_data->>'notes',''),(row_data->>'total_amount')::numeric,actor);
 RETURN sid;
END $$;
REVOKE ALL ON FUNCTION public.approve_commission_settlement(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_commission_settlement(jsonb) TO authenticated, service_role;