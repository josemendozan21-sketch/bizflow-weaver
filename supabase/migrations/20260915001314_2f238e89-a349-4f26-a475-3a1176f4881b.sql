CREATE OR REPLACE FUNCTION public.log_pos_product_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_fields text[] := ARRAY['name','brand','supplier','category','reference','sub_reference','sale_price','available','min_stock','unit','active','photo_url','notes'];
  f text;
  old_j jsonb;
  new_j jsonb;
BEGIN
  SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.pos_product_audit_log (product_id, location_id, product_name, action, field, old_value, new_value, changed_by, changed_by_email)
    VALUES (NEW.id, NEW.location_id, NEW.name, 'create', NULL, NULL, NULL, auth.uid(), v_email);
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.pos_product_audit_log (product_id, location_id, product_name, action, field, old_value, new_value, changed_by, changed_by_email)
    VALUES (OLD.id, OLD.location_id, OLD.name, 'delete', NULL, NULL, NULL, auth.uid(), v_email);
    RETURN OLD;
  END IF;

  old_j := to_jsonb(OLD);
  new_j := to_jsonb(NEW);

  FOREACH f IN ARRAY v_fields LOOP
    IF (old_j ->> f) IS DISTINCT FROM (new_j ->> f) THEN
      INSERT INTO public.pos_product_audit_log (product_id, location_id, product_name, action, field, old_value, new_value, changed_by, changed_by_email)
      VALUES (NEW.id, NEW.location_id, NEW.name, 'update', f, old_j ->> f, new_j ->> f, auth.uid(), v_email);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;