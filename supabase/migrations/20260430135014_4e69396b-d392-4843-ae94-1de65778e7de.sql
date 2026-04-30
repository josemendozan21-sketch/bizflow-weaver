
-- 1. Extend feria_inventory with dispatch tracking
ALTER TABLE public.feria_inventory
  ADD COLUMN IF NOT EXISTS quantity_dispatched integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dispatch_status text NOT NULL DEFAULT 'pendiente';

-- 2. feria_dispatch_requests table
CREATE TABLE IF NOT EXISTS public.feria_dispatch_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feria_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pendiente', -- pendiente | despachado
  furniture_dispatched boolean NOT NULL DEFAULT false,
  furniture_items text[] DEFAULT '{}',
  dispatch_notes text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  requested_by uuid,
  dispatched_at timestamptz,
  dispatched_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feria_dispatch_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view dispatch requests"
  ON public.feria_dispatch_requests FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manages dispatch requests"
  ON public.feria_dispatch_requests FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Logistica updates dispatch requests"
  ON public.feria_dispatch_requests FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'logistica'::app_role))
  WITH CHECK (has_role(auth.uid(), 'logistica'::app_role));

CREATE POLICY "Asesor can create dispatch requests"
  ON public.feria_dispatch_requests FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'asesor_comercial'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_feria_dispatch_requests_updated_at
  BEFORE UPDATE ON public.feria_dispatch_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. feria_pos_assignments table
CREATE TABLE IF NOT EXISTS public.feria_pos_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feria_id uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, feria_id)
);

ALTER TABLE public.feria_pos_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages pos assignments"
  ON public.feria_pos_assignments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own pos assignment"
  ON public.feria_pos_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 4. Helper to check whether the current POS user is assigned to a feria
CREATE OR REPLACE FUNCTION public.is_pos_for_feria(_feria_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.feria_pos_assignments
    WHERE user_id = auth.uid() AND feria_id = _feria_id
  )
$$;

-- 5. RLS policies so feria_pos role can read its feria + inventory and insert sales

CREATE POLICY "Feria POS can view own feria"
  ON public.ferias FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'feria_pos'::app_role) AND public.is_pos_for_feria(id));

CREATE POLICY "Feria POS can view own feria inventory"
  ON public.feria_inventory FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'feria_pos'::app_role) AND public.is_pos_for_feria(feria_id));

CREATE POLICY "Feria POS can view own feria sales"
  ON public.feria_sales FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'feria_pos'::app_role) AND public.is_pos_for_feria(feria_id));

CREATE POLICY "Feria POS can register sales"
  ON public.feria_sales FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'feria_pos'::app_role)
    AND public.is_pos_for_feria(feria_id)
    AND recorded_by = auth.uid()
  );
