CREATE OR REPLACE FUNCTION public.order_logo_pending(_order_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT lr.status::text
  FROM public.orders o
  JOIN public.orders g ON g.id = o.id OR (o.submission_id IS NOT NULL AND g.submission_id = o.submission_id)
  JOIN public.logo_requests lr ON lr.order_id = g.id
  WHERE o.id = _order_id
    AND lr.status NOT IN ('aprobado','finalizado')
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.order_logo_pending(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.block_production_until_logo_approved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _st text;
BEGIN
  IF NEW.order_id IS NULL THEN RETURN NEW; END IF;
  _st := public.order_logo_pending(NEW.order_id);
  IF _st IS NOT NULL THEN
    RAISE EXCEPTION 'Logo pendiente en Diseño (estado: %). El pedido pasa a Producción cuando Diseño y la asesora lo aprueben.', _st
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_block_production_until_logo_approved ON public.production_orders;
CREATE TRIGGER trg_block_production_until_logo_approved
BEFORE INSERT ON public.production_orders
FOR EACH ROW EXECUTE FUNCTION public.block_production_until_logo_approved();