CREATE OR REPLACE FUNCTION public.sync_order_sample_status_from_stamp_approvals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_status text;
  approved_now timestamptz;
  reject_reason text;
BEGIN
  IF NEW.order_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.stamp_size_status IN ('aprobado', 'finalizado')
     AND NEW.stamp_inkgel_status IN ('aprobado', 'finalizado') THEN
    next_status := 'muestra_aprobada';
    approved_now := GREATEST(
      COALESCE(NEW.stamp_size_approved_at, '-infinity'::timestamptz),
      COALESCE(NEW.stamp_inkgel_approved_at, '-infinity'::timestamptz)
    );
    IF approved_now = '-infinity'::timestamptz THEN
      approved_now := now();
    END IF;
    reject_reason := NULL;
  ELSIF NEW.stamp_size_status = 'rechazado' OR NEW.stamp_inkgel_status = 'rechazado' THEN
    next_status := 'muestra_rechazada';
    approved_now := NULL;
    reject_reason := NEW.stamp_advisor_feedback;
  ELSIF NEW.stamp_size_photo_url IS NOT NULL OR NEW.stamp_inkgel_photo_url IS NOT NULL THEN
    next_status := 'muestra_enviada';
    approved_now := NULL;
    reject_reason := NULL;
  ELSE
    next_status := 'pendiente_muestra';
    approved_now := NULL;
    reject_reason := NULL;
  END IF;

  UPDATE public.orders
  SET sample_status = next_status,
      sample_approved_at = approved_now,
      sample_reject_reason = reject_reason
  WHERE id = NEW.order_id
    AND (
      sample_status IS DISTINCT FROM next_status
      OR sample_approved_at IS DISTINCT FROM approved_now
      OR sample_reject_reason IS DISTINCT FROM reject_reason
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_order_sample_status_from_stamp_approvals ON public.production_orders;
CREATE TRIGGER trg_sync_order_sample_status_from_stamp_approvals
AFTER INSERT OR UPDATE OF stamp_size_status, stamp_inkgel_status, stamp_size_photo_url, stamp_inkgel_photo_url, stamp_size_approved_at, stamp_inkgel_approved_at, stamp_advisor_feedback
ON public.production_orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_sample_status_from_stamp_approvals();

UPDATE public.orders AS o
SET sample_status = CASE
      WHEN po.stamp_size_status IN ('aprobado', 'finalizado')
       AND po.stamp_inkgel_status IN ('aprobado', 'finalizado') THEN 'muestra_aprobada'
      WHEN po.stamp_size_status = 'rechazado' OR po.stamp_inkgel_status = 'rechazado' THEN 'muestra_rechazada'
      WHEN po.stamp_size_photo_url IS NOT NULL OR po.stamp_inkgel_photo_url IS NOT NULL THEN 'muestra_enviada'
      ELSE 'pendiente_muestra'
    END,
    sample_approved_at = CASE
      WHEN po.stamp_size_status IN ('aprobado', 'finalizado')
       AND po.stamp_inkgel_status IN ('aprobado', 'finalizado')
      THEN NULLIF(GREATEST(
        COALESCE(po.stamp_size_approved_at, '-infinity'::timestamptz),
        COALESCE(po.stamp_inkgel_approved_at, '-infinity'::timestamptz)
      ), '-infinity'::timestamptz)
      ELSE NULL
    END,
    sample_reject_reason = CASE
      WHEN po.stamp_size_status = 'rechazado' OR po.stamp_inkgel_status = 'rechazado'
      THEN po.stamp_advisor_feedback
      ELSE NULL
    END
FROM public.production_orders AS po
WHERE po.order_id = o.id
  AND (
    o.sample_status IS DISTINCT FROM CASE
      WHEN po.stamp_size_status IN ('aprobado', 'finalizado')
       AND po.stamp_inkgel_status IN ('aprobado', 'finalizado') THEN 'muestra_aprobada'
      WHEN po.stamp_size_status = 'rechazado' OR po.stamp_inkgel_status = 'rechazado' THEN 'muestra_rechazada'
      WHEN po.stamp_size_photo_url IS NOT NULL OR po.stamp_inkgel_photo_url IS NOT NULL THEN 'muestra_enviada'
      ELSE 'pendiente_muestra'
    END
    OR (o.sample_status = 'muestra_aprobada' AND o.sample_approved_at IS NULL)
    OR (o.sample_status <> 'muestra_aprobada' AND o.sample_approved_at IS NOT NULL)
  );