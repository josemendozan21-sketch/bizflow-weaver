-- Secuencia y numeración consecutiva de pedidos
CREATE SEQUENCE IF NOT EXISTS public.orders_order_number_seq;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number bigint,
  ADD COLUMN IF NOT EXISTS group_number bigint,
  ADD COLUMN IF NOT EXISTS line_index integer,
  ADD COLUMN IF NOT EXISTS line_count integer,
  ADD COLUMN IF NOT EXISTS logo_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS logo_url_2 text,
  ADD COLUMN IF NOT EXISTS logo_name text,
  ADD COLUMN IF NOT EXISTS logo_name_2 text;

-- Backfill histórico por fecha de creación
WITH numbered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn
  FROM public.orders
  WHERE order_number IS NULL
)
UPDATE public.orders o
   SET order_number = n.rn
  FROM numbered n
 WHERE o.id = n.id;

SELECT setval('public.orders_order_number_seq', COALESCE((SELECT MAX(order_number) FROM public.orders), 0) + 1, false);

ALTER TABLE public.orders
  ALTER COLUMN order_number SET DEFAULT nextval('public.orders_order_number_seq');

ALTER SEQUENCE public.orders_order_number_seq OWNED BY public.orders.order_number;

ALTER TABLE public.orders
  ALTER COLUMN order_number SET NOT NULL;

-- Código visible
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_code text
  GENERATED ALWAYS AS ('BN-' || lpad(order_number::text, 5, '0')) STORED;

-- Agrupación de líneas del mismo envío
CREATE OR REPLACE FUNCTION public.set_order_group_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  existing bigint;
BEGIN
  IF NEW.group_number IS NULL THEN
    IF NEW.submission_id IS NOT NULL THEN
      SELECT group_number INTO existing
        FROM public.orders
       WHERE submission_id = NEW.submission_id
         AND group_number IS NOT NULL
       ORDER BY order_number
       LIMIT 1;
    END IF;
    NEW.group_number := COALESCE(existing, NEW.order_number);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_order_group_number ON public.orders;
CREATE TRIGGER trg_set_order_group_number
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_order_group_number();

-- Backfill de grupos históricos
UPDATE public.orders o
   SET group_number = g.min_num
  FROM (
    SELECT submission_id, MIN(order_number) AS min_num
      FROM public.orders
     WHERE submission_id IS NOT NULL
     GROUP BY submission_id
  ) g
 WHERE o.submission_id = g.submission_id
   AND o.group_number IS NULL;

UPDATE public.orders
   SET group_number = order_number
 WHERE group_number IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders (order_number);
CREATE INDEX IF NOT EXISTS idx_orders_order_code ON public.orders (order_code);
CREATE INDEX IF NOT EXISTS idx_orders_group_number ON public.orders (group_number);

-- Propagación a producción y diseño
ALTER TABLE public.production_orders
  ADD COLUMN IF NOT EXISTS order_code text;

ALTER TABLE public.logo_requests
  ADD COLUMN IF NOT EXISTS original_logo_url_2 text;