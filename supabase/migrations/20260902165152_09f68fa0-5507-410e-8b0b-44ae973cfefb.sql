-- 1. Sigla del asesor en el perfil
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS advisor_code text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_advisor_code_uidx ON public.profiles (lower(advisor_code)) WHERE advisor_code IS NOT NULL;

-- 2. Siglas en pedidos
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS advisor_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS brand_code text;

-- 3. Nuevo formato del código de pedido
ALTER TABLE public.orders DROP COLUMN IF EXISTS order_code;
ALTER TABLE public.orders ADD COLUMN order_code text GENERATED ALWAYS AS (
  COALESCE(brand_code, 'XX') || '-' || COALESCE(advisor_code, 'XX') || '-' || lpad(order_number::text, 5, '0')
) STORED;
CREATE INDEX IF NOT EXISTS orders_order_code_idx ON public.orders (order_code);

-- 4. Trigger que asigna las siglas al crear un pedido
CREATE OR REPLACE FUNCTION public.set_order_codes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  code text;
BEGIN
  NEW.brand_code := CASE
    WHEN lower(COALESCE(NEW.brand, '')) LIKE '%sweat%' THEN 'SW'
    WHEN lower(COALESCE(NEW.brand, '')) LIKE '%magical%' THEN 'MW'
    ELSE 'XX'
  END;

  IF NEW.advisor_code IS NULL THEN
    SELECT p.advisor_code INTO code FROM public.profiles p WHERE p.user_id = NEW.advisor_id AND p.advisor_code IS NOT NULL LIMIT 1;
    IF code IS NULL THEN
      SELECT p.advisor_code INTO code FROM public.profiles p
       WHERE p.advisor_code IS NOT NULL
         AND (lower(p.email) = lower(COALESCE(NEW.advisor_name, '')) OR lower(p.display_name) = lower(COALESCE(NEW.advisor_name, '')))
       LIMIT 1;
    END IF;
    NEW.advisor_code := COALESCE(code, 'XX');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_order_codes ON public.orders;
CREATE TRIGGER trg_set_order_codes
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_order_codes();