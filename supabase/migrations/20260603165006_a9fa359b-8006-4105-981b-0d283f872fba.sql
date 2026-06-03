
-- 1) New columns on orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_credit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_due_date date,
  ADD COLUMN IF NOT EXISTS credit_dispatched_pending_payment boolean NOT NULL DEFAULT false;

-- 2) order_payments table
CREATE TABLE IF NOT EXISTS public.order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  proof_url text,
  notes text,
  method text,
  recorded_by uuid,
  recorded_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_payments_order_idx ON public.order_payments(order_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_payments TO authenticated;
GRANT ALL ON public.order_payments TO service_role;

ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;

-- SELECT: advisor owner, admin, contabilidad, logistica
CREATE POLICY "View payments by role" ON public.order_payments
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'contabilidad')
  OR public.has_role(auth.uid(), 'logistica')
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_payments.order_id AND o.advisor_id = auth.uid()
  )
);

-- INSERT: advisor owner, admin, contabilidad
CREATE POLICY "Insert payments" ON public.order_payments
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'contabilidad')
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_payments.order_id AND o.advisor_id = auth.uid()
  )
);

-- UPDATE: admin or contabilidad
CREATE POLICY "Update payments" ON public.order_payments
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'contabilidad')
);

-- DELETE: admin or contabilidad
CREATE POLICY "Delete payments" ON public.order_payments
FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'contabilidad')
);

-- updated_at trigger
CREATE TRIGGER trg_order_payments_updated_at
BEFORE UPDATE ON public.order_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Recalc abono trigger
CREATE OR REPLACE FUNCTION public.recalc_order_payments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_order uuid;
  paid_sum numeric;
  ord_total numeric;
BEGIN
  target_order := COALESCE(NEW.order_id, OLD.order_id);

  SELECT COALESCE(SUM(amount), 0) INTO paid_sum
  FROM public.order_payments
  WHERE order_id = target_order;

  SELECT COALESCE(total_amount, 0) INTO ord_total
  FROM public.orders WHERE id = target_order;

  UPDATE public.orders
  SET abono = paid_sum,
      payment_complete = (ord_total > 0 AND paid_sum >= ord_total)
  WHERE id = target_order;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_order_payments_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.order_payments
FOR EACH ROW EXECUTE FUNCTION public.recalc_order_payments();

-- 4) Auto-mark Ilian's orders as credit
CREATE OR REPLACE FUNCTION public.mark_ilian_orders_as_credit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.advisor_id = 'cdc6ce92-406f-467a-8f27-595c0cbe956a'::uuid THEN
    NEW.is_credit := true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mark_ilian_credit
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.mark_ilian_orders_as_credit();

-- Apply to existing Ilian orders
UPDATE public.orders
SET is_credit = true
WHERE advisor_id = 'cdc6ce92-406f-467a-8f27-595c0cbe956a'::uuid
  AND is_credit = false;

-- 5) Notify accounting when a credit order is dispatched with pending balance
CREATE OR REPLACE FUNCTION public.notify_credit_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  saldo numeric;
BEGIN
  IF NEW.credit_dispatched_pending_payment = true
     AND COALESCE(OLD.credit_dispatched_pending_payment, false) = false THEN
    saldo := GREATEST(COALESCE(NEW.total_amount, 0) - COALESCE(NEW.abono, 0), 0);
    INSERT INTO public.notifications (target_role, title, message, type, reference_id)
    VALUES (
      'contabilidad',
      'Pedido a crédito despachado',
      NEW.client_name || ' — saldo $' || to_char(saldo, 'FM999G999G999') ||
      COALESCE(' — vence ' || to_char(NEW.payment_due_date, 'DD/MM/YYYY'), '') ||
      ' (asesor: ' || COALESCE(NEW.advisor_name, '—') || ')',
      'credito_despachado',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_credit_dispatch
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_credit_dispatch();
