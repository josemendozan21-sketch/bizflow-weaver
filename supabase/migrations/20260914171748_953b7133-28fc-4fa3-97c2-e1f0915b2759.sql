CREATE OR REPLACE FUNCTION public.log_pos_product_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      ('supplier', OLD.supplier, NEW.supplier),
      ('sale_price', OLD.sale_price::text, NEW.sale_price::text),
      ('available', OLD.available::text, NEW.available::text),
      ('min_stock', OLD.min_stock::text, NEW.min_stock::text),
      ('unit', OLD.unit, NEW.unit),
      ('active', OLD.active::text, NEW.active::text),
      ('photo_url', CASE WHEN OLD.photo_url IS NULL THEN 'sin foto' ELSE 'foto' END,
                    CASE WHEN NEW.photo_url IS NULL THEN 'sin foto' ELSE 'foto' END)
    ) AS v(field, old_value, new_value)
  LOOP
    IF _rec.old_value IS DISTINCT FROM _rec.new_value
       OR (_rec.field = 'photo_url' AND OLD.photo_url IS DISTINCT FROM NEW.photo_url) THEN
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
$function$;