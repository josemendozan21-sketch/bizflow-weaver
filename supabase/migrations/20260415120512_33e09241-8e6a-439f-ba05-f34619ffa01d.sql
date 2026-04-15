
CREATE OR REPLACE FUNCTION public.get_all_deliveries()
RETURNS TABLE(
  id uuid,
  client_name text,
  brand text,
  product text,
  quantity integer,
  sale_type text,
  delivery_date date,
  production_status text,
  advisor_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.client_name, o.brand, o.product, o.quantity, o.sale_type, o.delivery_date, o.production_status, o.advisor_name
  FROM public.orders o
  WHERE o.delivery_date IS NOT NULL
$$;
