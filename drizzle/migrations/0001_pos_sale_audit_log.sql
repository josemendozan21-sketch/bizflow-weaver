CREATE TABLE public.pos_sale_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid,
  location_id uuid,
  action text NOT NULL,
  client_name text,
  total_amount numeric,
  field text,
  old_value text,
  new_value text,
  changed_by uuid,
  changed_by_email text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pos_sale_audit_log TO authenticated;
GRANT ALL ON public.pos_sale_audit_log TO service_role;

ALTER TABLE public.pos_sale_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura del historial de ventas del punto"
ON public.pos_sale_audit_log FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'contabilidad'::app_role)
  OR has_role(auth.uid(), 'inventarios'::app_role)
  OR is_pos_for_location(location_id)
);

CREATE INDEX idx_pos_sale_audit_changed_at ON public.pos_sale_audit_log (changed_at DESC);
CREATE INDEX idx_pos_sale_audit_location ON public.pos_sale_audit_log (location_id);
CREATE INDEX idx_pos_sale_audit_sale ON public.pos_sale_audit_log (sale_id);

CREATE OR REPLACE FUNCTION public.log_pos_sale_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_fields text[] := ARRAY['payment_method','total_amount','discount','client_name','client_document','notes'];
  f text;
  old_j jsonb;
  new_j jsonb;
BEGIN
  SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.pos_sale_audit_log (sale_id, location_id, action, client_name, total_amount, changed_by, changed_by_email)
    VALUES (OLD.id, OLD.location_id, 'delete', OLD.client_name, OLD.total_amount, auth.uid(), v_email);
    RETURN OLD;
  END IF;

  old_j := to_jsonb(OLD);
  new_j := to_jsonb(NEW);

  FOREACH f IN ARRAY v_fields LOOP
    IF (old_j ->> f) IS DISTINCT FROM (new_j ->> f) THEN
      INSERT INTO public.pos_sale_audit_log (sale_id, location_id, action, client_name, total_amount, field, old_value, new_value, changed_by, changed_by_email)
      VALUES (NEW.id, NEW.location_id, 'update', NEW.client_name, NEW.total_amount, f, old_j ->> f, new_j ->> f, auth.uid(), v_email);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_log_pos_sale_change ON public.pos_sales;
CREATE TRIGGER trg_log_pos_sale_change
AFTER UPDATE OR DELETE ON public.pos_sales
FOR EACH ROW EXECUTE FUNCTION public.log_pos_sale_change();