ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS sample_status text NOT NULL DEFAULT 'pendiente_muestra',
  ADD COLUMN IF NOT EXISTS sample_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS sample_reject_reason text;

UPDATE public.orders
SET sample_status = 'muestra_aprobada',
    sample_approved_at = COALESCE(sample_approved_at, now())
WHERE production_status IS DISTINCT FROM 'pendiente'
   OR COALESCE(logo_url, '') = '';

CREATE OR REPLACE FUNCTION public.notify_inventarios_sample_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sample_status = 'muestra_aprobada'
     AND COALESCE(OLD.sample_status, '') <> 'muestra_aprobada' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE reference_id = NEW.id
        AND target_role = 'inventarios'
        AND title = 'Muestra aprobada'
    ) THEN
      INSERT INTO public.notifications (target_role, title, message, type, reference_id)
      VALUES (
        'inventarios',
        'Muestra aprobada',
        'El pedido ' || COALESCE(NEW.order_code, '') || ' de ' || COALESCE(NEW.client_name, '') ||
        ' tiene la muestra aprobada. Ya puedes entregar los cuerpos.',
        'info',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_inventarios_sample_approved ON public.orders;
CREATE TRIGGER trg_notify_inventarios_sample_approved
AFTER UPDATE OF sample_status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_inventarios_sample_approved();

DROP POLICY IF EXISTS "Estampacion can update sample status" ON public.orders;
CREATE POLICY "Estampacion can update sample status"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'estampacion')
  OR public.has_role(auth.uid(), 'produccion')
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'estampacion')
  OR public.has_role(auth.uid(), 'produccion')
  OR public.has_role(auth.uid(), 'admin')
);