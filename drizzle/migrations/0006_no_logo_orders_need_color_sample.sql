CREATE OR REPLACE FUNCTION public.set_sample_status_no_logo()
 RETURNS trigger LANGUAGE plpgsql AS $function$
begin
  -- Sin logo no hay muestra de tamaño, pero sí de color de gel / escarcha.
  if new.sale_type='mayor' and new.logo_url is null and coalesce(new.logo_source,'sin_logo')='sin_logo' then
    new.sample_status := 'pendiente_muestra';
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.auto_skip_size_sample_no_logo()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
begin
  if new.order_id is not null and new.logo_file is null
     and coalesce(new.stamp_size_status,'pendiente') = 'pendiente'
     and exists (select 1 from orders o where o.id = new.order_id and o.sale_type='mayor'
                 and o.logo_url is null and coalesce(o.logo_source,'sin_logo')='sin_logo') then
    new.stamp_size_status := 'aprobado';
  end if;
  return new;
end $function$;

DROP TRIGGER IF EXISTS trg_auto_skip_size_sample_no_logo ON public.production_orders;
CREATE TRIGGER trg_auto_skip_size_sample_no_logo
BEFORE INSERT OR UPDATE ON public.production_orders
FOR EACH ROW EXECUTE FUNCTION public.auto_skip_size_sample_no_logo();