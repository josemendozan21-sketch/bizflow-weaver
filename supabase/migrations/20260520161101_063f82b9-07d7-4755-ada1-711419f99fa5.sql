
-- 1) Add stage milestone columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS production_due_date date,
  ADD COLUMN IF NOT EXISTS stamping_due_date date,
  ADD COLUMN IF NOT EXISTS production_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS stamping_completed_at timestamptz;

-- 2) Trigger to auto-compute due dates from delivery_date
CREATE OR REPLACE FUNCTION public.set_order_stage_due_dates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.delivery_date IS NOT NULL THEN
    IF NEW.production_due_date IS NULL THEN
      NEW.production_due_date := NEW.delivery_date - INTERVAL '5 days';
    END IF;
    IF NEW.stamping_due_date IS NULL THEN
      NEW.stamping_due_date := NEW.delivery_date - INTERVAL '2 days';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_stage_due_dates ON public.orders;
CREATE TRIGGER trg_orders_stage_due_dates
BEFORE INSERT OR UPDATE OF delivery_date ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_order_stage_due_dates();

-- Backfill due dates for existing rows
UPDATE public.orders
   SET production_due_date = COALESCE(production_due_date, delivery_date - INTERVAL '5 days'),
       stamping_due_date   = COALESCE(stamping_due_date,   delivery_date - INTERVAL '2 days')
 WHERE delivery_date IS NOT NULL;

-- 3) Area compliance rules table
CREATE TABLE IF NOT EXISTS public.area_compliance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area text NOT NULL UNIQUE,
  percentage numeric NOT NULL DEFAULT 2,
  min_threshold_pct numeric NOT NULL DEFAULT 0.80,
  bonus_amount numeric NOT NULL DEFAULT 0,
  bonus_threshold_pct numeric NOT NULL DEFAULT 0.90,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.area_compliance_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage area_compliance_rules" ON public.area_compliance_rules;
CREATE POLICY "Admins manage area_compliance_rules"
  ON public.area_compliance_rules FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated view area_compliance_rules" ON public.area_compliance_rules;
CREATE POLICY "Authenticated view area_compliance_rules"
  ON public.area_compliance_rules FOR SELECT
  TO authenticated
  USING (true);

DROP TRIGGER IF EXISTS trg_area_compliance_updated ON public.area_compliance_rules;
CREATE TRIGGER trg_area_compliance_updated
BEFORE UPDATE ON public.area_compliance_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default rules
INSERT INTO public.area_compliance_rules (area, percentage, min_threshold_pct, bonus_amount, bonus_threshold_pct)
VALUES
  ('produccion',  2, 0.80, 100000, 0.90),
  ('estampacion', 2, 0.80, 100000, 0.90),
  ('logistica',   2, 0.85, 100000, 0.95)
ON CONFLICT (area) DO NOTHING;
