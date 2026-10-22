CREATE POLICY commission_proof_read_scope ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated USING (bucket_id <> 'payment-proofs' OR name NOT LIKE 'commissions/%' OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contabilidad') OR EXISTS(SELECT 1 FROM public.commission_payouts p WHERE p.proof_url=name AND p.advisor_id=auth.uid()) OR owner_id=auth.uid()::text);
CREATE OR REPLACE FUNCTION public.validate_commission_settlement_payment_cap() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sid uuid; cap numeric; used numeric;
BEGIN
 PERFORM pg_advisory_xact_lock(7192142026);
 IF NEW.settlement_item_id IS NOT NULL THEN SELECT settlement_id INTO sid FROM public.commission_settlement_items WHERE id=NEW.settlement_item_id; ELSE sid:=NEW.settlement_id; END IF;
 IF sid IS NOT NULL THEN
  SELECT total_amount INTO cap FROM public.commission_settlements WHERE id=sid FOR UPDATE;
  SELECT coalesce(sum(a.amount),0) INTO used FROM public.commission_payment_allocations a JOIN public.commission_payouts p ON p.id=a.payout_id LEFT JOIN public.commission_settlement_items i ON i.id=a.settlement_item_id WHERE coalesce(a.settlement_id,i.settlement_id)=sid AND p.reconciliation_status NOT IN ('reversed','legacy_unreviewed');
  IF used+NEW.amount>cap THEN RAISE EXCEPTION 'La asignación supera el saldo total de la liquidación'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER commission_payment_settlement_cap BEFORE INSERT ON public.commission_payment_allocations FOR EACH ROW EXECUTE FUNCTION public.validate_commission_settlement_payment_cap();