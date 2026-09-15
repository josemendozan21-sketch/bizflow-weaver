ALTER TABLE public.pos_products
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS sub_reference text;

CREATE OR REPLACE FUNCTION public.log_pos_product_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
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

  IF NEW.name IS DISTINCT FROM OLD.name THEN
    INSERT INTO public.pos_product_audit_log (product_id, location_id, product_name, action, field, old_value, new_value, changed_by, changed_by_email)
    VALUES (NEW.id, NEW.location_id, NEW.name, 'update', 'name', OLD.name, NEW.name, auth.uid(), v_email);
  END IF;
  IF NEW.brand IS DISTINCT FROM OLD.brand THEN
    INSERT INTO public.pos_product_audit_log (product_id, location_id, product_name, action, field, old_value, new_value, changed_by, changed_by_email)
    VALUES (NEW.id, NEW.location_id, NEW.name, 'update', 'brand', OLD.brand, NEW.brand, auth.uid(), v_email);
  END IF;
  IF NEW.supplier IS DISTINCT FROM OLD.supplier THEN
    INSERT INTO public.pos_product_audit_log (product_id, location_id, product_name, action, field, old_value, new_value, changed_by, changed_by_email)
    VALUES (NEW.id, NEW.location_id, NEW.name, 'update', 'supplier', OLD.supplier, NEW.supplier, auth.uid(), v_email);
  END IF;
  IF NEW.category IS DISTINCT FROM OLD.category THEN
    INSERT INTO public.pos_product_audit_log (product_id, location_id, product_name, action, field, old_value, new_value, changed_by, changed_by_email)
    VALUES (NEW.id, NEW.location_id, NEW.name, 'update', 'category', OLD.category, NEW.category, auth.uid(), v_email);
  END IF;
  IF NEW.reference IS DISTINCT FROM OLD.reference THEN
    INSERT INTO public.pos_product_audit_log (product_id, location_id, product_name, action, field, old_value, new_value, changed_by, changed_by_email)
    VALUES (NEW.id, NEW.location_id, NEW.name, 'update', 'reference', OLD.reference, NEW.reference, auth.uid(), v_email);
  END IF;
  IF NEW.sub_reference IS DISTINCT FROM OLD.sub_reference THEN
    INSERT INTO public.pos_product_audit_log (product_id, location_id, product_name, action, field, old_value, new_value, changed_by, changed_by_email)
    VALUES (NEW.id, NEW.location_id, NEW.name, 'update', 'sub_reference', OLD.sub_reference, NEW.sub_reference, auth.uid(), v_email);
  END IF;
  IF NEW.price IS DISTINCT FROM OLD.price THEN
    INSERT INTO public.pos_product_audit_log (product_id, location_id, product_name, action, field, old_value, new_value, changed_by, changed_by_email)
    VALUES (NEW.id, NEW.location_id, NEW.name, 'update', 'price', OLD.price::text, NEW.price::text, auth.uid(), v_email);
  END IF;
  IF NEW.available IS DISTINCT FROM OLD.available THEN
    INSERT INTO public.pos_product_audit_log (product_id, location_id, product_name, action, field, old_value, new_value, changed_by, changed_by_email)
    VALUES (NEW.id, NEW.location_id, NEW.name, 'update', 'available', OLD.available::text, NEW.available::text, auth.uid(), v_email);
  END IF;
  IF NEW.unit IS DISTINCT FROM OLD.unit THEN
    INSERT INTO public.pos_product_audit_log (product_id, location_id, product_name, action, field, old_value, new_value, changed_by, changed_by_email)
    VALUES (NEW.id, NEW.location_id, NEW.name, 'update', 'unit', OLD.unit, NEW.unit, auth.uid(), v_email);
  END IF;
  IF NEW.active IS DISTINCT FROM OLD.active THEN
    INSERT INTO public.pos_product_audit_log (product_id, location_id, product_name, action, field, old_value, new_value, changed_by, changed_by_email)
    VALUES (NEW.id, NEW.location_id, NEW.name, 'update', 'active', OLD.active::text, NEW.active::text, auth.uid(), v_email);
  END IF;
  IF NEW.photo_url IS DISTINCT FROM OLD.photo_url THEN
    INSERT INTO public.pos_product_audit_log (product_id, location_id, product_name, action, field, old_value, new_value, changed_by, changed_by_email)
    VALUES (NEW.id, NEW.location_id, NEW.name, 'update', 'photo_url', OLD.photo_url, NEW.photo_url, auth.uid(), v_email);
  END IF;

  RETURN NEW;
END;
$$;