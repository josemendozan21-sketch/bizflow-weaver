-- 1. Cargos adicionales por pedido
CREATE TABLE public.order_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  concept text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_charges TO authenticated;
GRANT ALL ON public.order_charges TO service_role;
ALTER TABLE public.order_charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_charges_select" ON public.order_charges FOR SELECT TO authenticated USING (true);
CREATE POLICY "order_charges_insert" ON public.order_charges FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "order_charges_update" ON public.order_charges FOR UPDATE TO authenticated USING (true);
CREATE POLICY "order_charges_delete" ON public.order_charges FOR DELETE TO authenticated USING (true);
CREATE INDEX idx_order_charges_order ON public.order_charges(order_id);
CREATE TRIGGER trg_order_charges_updated BEFORE UPDATE ON public.order_charges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Historial de cambios de pedidos
CREATE TABLE public.order_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  order_code text,
  field text NOT NULL,
  old_value text,
  new_value text,
  changed_by uuid,
  changed_by_name text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_change_log TO authenticated;
GRANT ALL ON public.order_change_log TO service_role;
ALTER TABLE public.order_change_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_change_log_select" ON public.order_change_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "order_change_log_insert" ON public.order_change_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX idx_order_change_log_order ON public.order_change_log(order_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_order_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  actor_name text;
BEGIN
  SELECT full_name INTO actor_name FROM public.profiles WHERE id = actor;

  IF COALESCE(NEW.quantity,0) IS DISTINCT FROM COALESCE(OLD.quantity,0) THEN
    INSERT INTO public.order_change_log(order_id, order_code, field, old_value, new_value, changed_by, changed_by_name)
    VALUES (NEW.id, NEW.order_code, 'quantity', OLD.quantity::text, NEW.quantity::text, actor, actor_name);
  END IF;
  IF COALESCE(NEW.unit_price,0) IS DISTINCT FROM COALESCE(OLD.unit_price,0) THEN
    INSERT INTO public.order_change_log(order_id, order_code, field, old_value, new_value, changed_by, changed_by_name)
    VALUES (NEW.id, NEW.order_code, 'unit_price', OLD.unit_price::text, NEW.unit_price::text, actor, actor_name);
  END IF;
  IF COALESCE(NEW.total_amount,0) IS DISTINCT FROM COALESCE(OLD.total_amount,0) THEN
    INSERT INTO public.order_change_log(order_id, order_code, field, old_value, new_value, changed_by, changed_by_name)
    VALUES (NEW.id, NEW.order_code, 'total_amount', OLD.total_amount::text, NEW.total_amount::text, actor, actor_name);
  END IF;
  IF COALESCE(NEW.abono,0) IS DISTINCT FROM COALESCE(OLD.abono,0) THEN
    INSERT INTO public.order_change_log(order_id, order_code, field, old_value, new_value, changed_by, changed_by_name)
    VALUES (NEW.id, NEW.order_code, 'abono', OLD.abono::text, NEW.abono::text, actor, actor_name);
  END IF;
  IF NEW.production_status IS DISTINCT FROM OLD.production_status THEN
    INSERT INTO public.order_change_log(order_id, order_code, field, old_value, new_value, changed_by, changed_by_name)
    VALUES (NEW.id, NEW.order_code, 'production_status', OLD.production_status, NEW.production_status, actor, actor_name);
  END IF;
  IF NEW.ink_color IS DISTINCT FROM OLD.ink_color THEN
    INSERT INTO public.order_change_log(order_id, order_code, field, old_value, new_value, changed_by, changed_by_name)
    VALUES (NEW.id, NEW.order_code, 'ink_color', OLD.ink_color, NEW.ink_color, actor, actor_name);
  END IF;
  IF NEW.gel_color IS DISTINCT FROM OLD.gel_color THEN
    INSERT INTO public.order_change_log(order_id, order_code, field, old_value, new_value, changed_by, changed_by_name)
    VALUES (NEW.id, NEW.order_code, 'gel_color', OLD.gel_color, NEW.gel_color, actor, actor_name);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_order_change AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_change();

-- 3. Historial de estados de solicitudes de logo
CREATE TABLE public.logo_request_status_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_request_id uuid NOT NULL REFERENCES public.logo_requests(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid,
  changed_by_name text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.logo_request_status_log TO authenticated;
GRANT ALL ON public.logo_request_status_log TO service_role;
ALTER TABLE public.logo_request_status_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logo_status_log_select" ON public.logo_request_status_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "logo_status_log_insert" ON public.logo_request_status_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX idx_logo_status_log_req ON public.logo_request_status_log(logo_request_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_logo_request_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  actor_name text;
BEGIN
  SELECT full_name INTO actor_name FROM public.profiles WHERE id = actor;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.logo_request_status_log(logo_request_id, old_status, new_status, changed_by, changed_by_name, note)
    VALUES (NEW.id, NULL, NEW.status::text, actor, actor_name, 'Solicitud creada');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.logo_request_status_log(logo_request_id, old_status, new_status, changed_by, changed_by_name, note)
    VALUES (NEW.id, OLD.status::text, NEW.status::text, actor, actor_name,
      CASE WHEN NEW.adjusted_logo_url IS DISTINCT FROM OLD.adjusted_logo_url THEN 'Se subió/actualizó el diseño ajustado' ELSE NULL END);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_logo_status AFTER INSERT OR UPDATE ON public.logo_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_logo_request_status();

-- 4. Corrección del recálculo de abonos: nunca borrar el abono inicial
CREATE OR REPLACE FUNCTION public.recalc_order_payments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_order uuid;
  paid_sum numeric;
  payment_count integer;
  ord_total numeric;
BEGIN
  target_order := COALESCE(NEW.order_id, OLD.order_id);

  SELECT COALESCE(SUM(amount), 0), COUNT(*) INTO paid_sum, payment_count
  FROM public.order_payments
  WHERE order_id = target_order;

  SELECT COALESCE(total_amount, 0) INTO ord_total
  FROM public.orders WHERE id = target_order;

  IF payment_count = 0 THEN
    -- No hay pagos registrados: conservar el abono inicial del pedido
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.orders
  SET abono = paid_sum,
      payment_complete = (ord_total > 0 AND paid_sum >= ord_total)
  WHERE id = target_order;

  RETURN COALESCE(NEW, OLD);
END;
$$;