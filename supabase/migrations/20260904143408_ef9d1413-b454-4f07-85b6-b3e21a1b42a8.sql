CREATE OR REPLACE FUNCTION public.link_logo_request_to_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.logo_url IS NULL OR NEW.logo_url = '' THEN
    RETURN NEW;
  END IF;

  UPDATE public.logo_requests lr
     SET order_id = NEW.id
   WHERE lr.id = (
     SELECT l2.id
       FROM public.logo_requests l2
      WHERE l2.order_id IS NULL
        AND l2.advisor_id = NEW.advisor_id
        AND lower(btrim(l2.client_name)) = lower(btrim(NEW.client_name))
        AND l2.created_at > now() - interval '30 minutes'
      ORDER BY l2.created_at DESC
      LIMIT 1
   );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_logo_request_to_order ON public.orders;
CREATE TRIGGER trg_link_logo_request_to_order
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.link_logo_request_to_order();

-- Backfill 1: coincidencia exacta por archivo de logo
UPDATE public.logo_requests lr
   SET order_id = o.id
  FROM public.orders o
 WHERE lr.order_id IS NULL
   AND lr.original_logo_url LIKE 'http%'
   AND o.logo_url = lr.original_logo_url;

-- Backfill 2: mismo asesor y cliente, pedido creado en la misma ventana de tiempo
UPDATE public.logo_requests lr
   SET order_id = sub.order_id
  FROM (
    SELECT l.id AS req_id, o.id AS order_id,
           row_number() OVER (PARTITION BY l.id ORDER BY abs(EXTRACT(EPOCH FROM (o.created_at - l.created_at)))) AS rn
      FROM public.logo_requests l
      JOIN public.orders o
        ON o.advisor_id = l.advisor_id
       AND lower(btrim(o.client_name)) = lower(btrim(l.client_name))
       AND o.created_at BETWEEN l.created_at - interval '30 minutes' AND l.created_at + interval '30 minutes'
     WHERE l.order_id IS NULL
  ) sub
 WHERE sub.rn = 1 AND lr.id = sub.req_id;