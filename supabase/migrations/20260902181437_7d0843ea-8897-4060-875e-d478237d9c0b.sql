CREATE TABLE public.inventory_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  item_name text,
  brand text,
  category text,
  product_type text,
  field text,
  old_value text,
  new_value text,
  changed_by uuid,
  changed_by_email text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.inventory_audit_log TO authenticated;
GRANT ALL ON public.inventory_audit_log TO service_role;

ALTER TABLE public.inventory_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e inventarios pueden leer la bitacora"
ON public.inventory_audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'inventarios'));

CREATE INDEX idx_inventory_audit_changed_at ON public.inventory_audit_log (changed_at DESC);
CREATE INDEX idx_inventory_audit_record ON public.inventory_audit_log (record_id);
CREATE INDEX idx_inventory_audit_user ON public.inventory_audit_log (changed_by);

CREATE OR REPLACE FUNCTION public.log_inventory_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  uemail text;
  f text;
  fields text[];
  oldv text;
  newv text;
  rec_name text;
  rec_brand text;
  rec_cat text;
  rec_type text;
  rid uuid;
BEGIN
  SELECT email INTO uemail FROM public.profiles WHERE user_id = uid LIMIT 1;

  IF TG_TABLE_NAME = 'stock_items' THEN
    fields := ARRAY['available','in_process','name','brand','category','product_type','min_stock','unit','color'];
  ELSE
    fields := ARRAY['available','referencia','brand'];
  END IF;

  IF TG_OP = 'DELETE' THEN
    rid := OLD.id;
    rec_brand := OLD.brand;
    IF TG_TABLE_NAME = 'stock_items' THEN
      rec_name := OLD.name; rec_cat := OLD.category; rec_type := OLD.product_type;
    ELSE
      rec_name := OLD.referencia; rec_cat := 'cuerpos_referencias';
    END IF;
    INSERT INTO public.inventory_audit_log (table_name, record_id, action, item_name, brand, category, product_type, field, old_value, new_value, changed_by, changed_by_email)
    VALUES (TG_TABLE_NAME, rid, 'eliminacion', rec_name, rec_brand, rec_cat, rec_type, 'available', (to_jsonb(OLD)->>'available'), NULL, uid, uemail);
    RETURN OLD;
  END IF;

  rid := NEW.id;
  rec_brand := NEW.brand;
  IF TG_TABLE_NAME = 'stock_items' THEN
    rec_name := NEW.name; rec_cat := NEW.category; rec_type := NEW.product_type;
  ELSE
    rec_name := NEW.referencia; rec_cat := 'cuerpos_referencias';
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.inventory_audit_log (table_name, record_id, action, item_name, brand, category, product_type, field, old_value, new_value, changed_by, changed_by_email)
    VALUES (TG_TABLE_NAME, rid, 'creacion', rec_name, rec_brand, rec_cat, rec_type, 'available', NULL, (to_jsonb(NEW)->>'available'), uid, uemail);
    RETURN NEW;
  END IF;

  FOREACH f IN ARRAY fields LOOP
    oldv := to_jsonb(OLD)->>f;
    newv := to_jsonb(NEW)->>f;
    IF oldv IS DISTINCT FROM newv THEN
      INSERT INTO public.inventory_audit_log (table_name, record_id, action, item_name, brand, category, product_type, field, old_value, new_value, changed_by, changed_by_email)
      VALUES (TG_TABLE_NAME, rid, 'edicion', rec_name, rec_brand, rec_cat, rec_type, f, oldv, newv, uid, uemail);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_inventory_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_log_stock_items_changes
AFTER INSERT OR UPDATE OR DELETE ON public.stock_items
FOR EACH ROW EXECUTE FUNCTION public.log_inventory_change();

CREATE TRIGGER trg_log_body_stock_changes
AFTER INSERT OR UPDATE OR DELETE ON public.body_stock
FOR EACH ROW EXECUTE FUNCTION public.log_inventory_change();