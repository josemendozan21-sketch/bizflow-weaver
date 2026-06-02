
-- Track per-stage operator + start/end timestamps for production orders
CREATE TABLE public.production_stage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  stage text NOT NULL,
  operator_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_psl_order ON public.production_stage_logs(production_order_id);
CREATE INDEX idx_psl_open ON public.production_stage_logs(production_order_id, stage) WHERE ended_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_stage_logs TO authenticated;
GRANT ALL ON public.production_stage_logs TO service_role;

ALTER TABLE public.production_stage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view stage logs"
ON public.production_stage_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Produccion and admin manage stage logs"
ON public.production_stage_logs FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'produccion'::app_role)
  OR has_role(auth.uid(), 'estampacion'::app_role)
  OR has_role(auth.uid(), 'inventarios'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'produccion'::app_role)
  OR has_role(auth.uid(), 'estampacion'::app_role)
  OR has_role(auth.uid(), 'inventarios'::app_role)
);
