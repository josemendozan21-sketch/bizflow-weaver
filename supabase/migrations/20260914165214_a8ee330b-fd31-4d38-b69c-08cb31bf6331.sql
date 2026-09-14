CREATE TABLE public.pos_product_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid,
  product_id uuid,
  action text NOT NULL,
  product_name text,
  brand text,
  category text,
  field text,
  old_value text,
  new_value text,
  changed_by uuid,
  changed_by_email text,
  source text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pos_product_audit_log TO authenticated;
GRANT ALL ON public.pos_product_audit_log TO service_role;

ALTER TABLE public.pos_product_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura del historial de productos del punto"
ON public.pos_product_audit_log FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'contabilidad')
  OR public.has_role(auth.uid(), 'inventarios')
  OR public.is_pos_for_location(location_id)
);

CREATE INDEX idx_pos_product_audit_changed_at ON public.pos_product_audit_log (changed_at DESC);
CREATE INDEX idx_pos_product_audit_location ON public.pos_product_audit_log (location_id);
CREATE INDEX idx_pos_product_audit_product ON public.pos_product_audit_log (product_id);

CREATE OR REPLACE FUNCTION public.log_pos_product_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _rec record;
BEGIN
  SELECT p.email INTO _email FROM public.profiles p WHERE p.id = _uid;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.pos_product_audit_log
      (location_id, product_id, action, product_name, brand, category, field, old_value, new_value, changed_by, changed_by_email)
    VALUES (NEW.location_id, NEW.id, 'creacion', NEW.name, NEW.brand, NEW.category, NULL, NULL, NULL, _uid, _email);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.pos_product_audit_log
      (location_id, product_id, action, product_name, brand, category, field, old_value, new_value, changed_by, changed_by_email)
    VALUES (OLD.location_id, OLD.id, 'eliminacion', OLD.name, OLD.brand, OLD.category, NULL, NULL, NULL, _uid, _email);
    RETURN OLD;
  END IF;

  FOR _rec IN
    SELECT * FROM (VALUES
      ('name', OLD.name, NEW.name),
      ('brand', OLD.brand, NEW.brand),
      ('category', OLD.category, NEW.category),
      ('sale_price', OLD.sale_price::text, NEW.sale_price::text),
      ('available', OLD.available::text, NEW.available::text),
      ('min_stock', OLD.min_stock::text, NEW.min_stock::text),
      ('unit', OLD.unit, NEW.unit),
      ('active', OLD.active::text, NEW.active::text)
    ) AS v(field, old_value, new_value)
  LOOP
    IF _rec.old_value IS DISTINCT FROM _rec.new_value THEN
      INSERT INTO public.pos_product_audit_log
        (location_id, product_id, action, product_name, brand, category, field, old_value, new_value, changed_by, changed_by_email)
      VALUES (NEW.location_id, NEW.id,
        CASE WHEN _rec.field = 'active' AND NEW.active = false THEN 'desactivacion'
             WHEN _rec.field = 'active' AND NEW.active = true THEN 'activacion'
             ELSE 'edicion' END,
        NEW.name, NEW.brand, NEW.category, _rec.field, _rec.old_value, _rec.new_value, _uid, _email);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_pos_product_change() FROM public, anon, authenticated;

CREATE TRIGGER trg_log_pos_product_change
AFTER INSERT OR UPDATE OR DELETE ON public.pos_products
FOR EACH ROW EXECUTE FUNCTION public.log_pos_product_change();