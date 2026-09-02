CREATE OR REPLACE FUNCTION public.log_inventory_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  rec_logo text;
  rid uuid;
BEGIN
  -- Skip logging when the change comes from the mirror sync triggers
  -- (stock_items <-> body_stock). Otherwise a single user edit is logged twice.
  IF pg_trigger_depth() > 1 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT email INTO uemail FROM public.profiles WHERE user_id = uid LIMIT 1;

  IF TG_TABLE_NAME = 'stock_items' THEN
    fields := ARRAY['available','in_process','name','brand','category','product_type','min_stock','unit','color','logo','sweatspot_category'];
  ELSE
    fields := ARRAY['available','referencia','brand'];
  END IF;

  IF TG_OP = 'DELETE' THEN
    rid := OLD.id;
    rec_brand := OLD.brand;
    rec_logo := CASE WHEN TG_TABLE_NAME = 'stock_items' THEN (to_jsonb(OLD)->>'logo') ELSE NULL END;
    IF TG_TABLE_NAME = 'stock_items' THEN
      rec_name := OLD.name; rec_cat := OLD.category; rec_type := OLD.product_type;
    ELSE
      rec_name := OLD.referencia; rec_cat := 'cuerpos_referencias';
    END IF;
    INSERT INTO public.inventory_audit_log (table_name, record_id, action, item_name, brand, category, product_type, logo, field, old_value, new_value, changed_by, changed_by_email)
    VALUES (TG_TABLE_NAME, rid, 'eliminacion', rec_name, rec_brand, rec_cat, rec_type, rec_logo, 'available', (to_jsonb(OLD)->>'available'), NULL, uid, uemail);
    RETURN OLD;
  END IF;

  rid := NEW.id;
  rec_brand := NEW.brand;
  rec_logo := CASE WHEN TG_TABLE_NAME = 'stock_items' THEN (to_jsonb(NEW)->>'logo') ELSE NULL END;
  IF TG_TABLE_NAME = 'stock_items' THEN
    rec_name := NEW.name; rec_cat := NEW.category; rec_type := NEW.product_type;
  ELSE
    rec_name := NEW.referencia; rec_cat := 'cuerpos_referencias';
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.inventory_audit_log (table_name, record_id, action, item_name, brand, category, product_type, logo, field, old_value, new_value, changed_by, changed_by_email)
    VALUES (TG_TABLE_NAME, rid, 'creacion', rec_name, rec_brand, rec_cat, rec_type, rec_logo, 'available', NULL, (to_jsonb(NEW)->>'available'), uid, uemail);
    RETURN NEW;
  END IF;

  FOREACH f IN ARRAY fields LOOP
    oldv := to_jsonb(OLD)->>f;
    newv := to_jsonb(NEW)->>f;
    IF oldv IS DISTINCT FROM newv THEN
      INSERT INTO public.inventory_audit_log (table_name, record_id, action, item_name, brand, category, product_type, logo, field, old_value, new_value, changed_by, changed_by_email)
      VALUES (TG_TABLE_NAME, rid, 'edicion', rec_name, rec_brand, rec_cat, rec_type, rec_logo, f, oldv, newv, uid, uemail);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;