
-- Add projection/commission settings to ferias
ALTER TABLE public.ferias
  ADD COLUMN IF NOT EXISTS target_margin_pct numeric NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS iva_pct numeric NOT NULL DEFAULT 19,
  ADD COLUMN IF NOT EXISTS commission_tier_1_pct numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS commission_tier_2_pct numeric NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS commission_tier_3_pct numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS commission_tier_1_to_pct numeric NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS commission_tier_2_to_pct numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS scenarios jsonb NOT NULL DEFAULT '{
    "pesimista": {"ticket_promedio": 0, "visitantes_esperados": 0, "tasa_conversion_pct": 0},
    "realista":  {"ticket_promedio": 0, "visitantes_esperados": 0, "tasa_conversion_pct": 0},
    "optimista": {"ticket_promedio": 0, "visitantes_esperados": 0, "tasa_conversion_pct": 0}
  }'::jsonb;

-- Commissions table
CREATE TABLE IF NOT EXISTS public.feria_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feria_id uuid NOT NULL REFERENCES public.ferias(id) ON DELETE CASCADE,
  advisor_id uuid,
  advisor_name text NOT NULL,
  sales_with_iva numeric NOT NULL DEFAULT 0,
  sales_without_iva numeric NOT NULL DEFAULT 0,
  excedente numeric NOT NULL DEFAULT 0,
  applied_pct numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'propuesta',
  approved_by uuid,
  approved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (feria_id, advisor_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feria_commissions TO authenticated;
GRANT ALL ON public.feria_commissions TO service_role;

ALTER TABLE public.feria_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and accounting manage commissions"
  ON public.feria_commissions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'contabilidad'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'contabilidad'));

CREATE POLICY "Advisors read own commissions"
  ON public.feria_commissions FOR SELECT
  TO authenticated
  USING (advisor_id = auth.uid());

CREATE TRIGGER update_feria_commissions_updated_at
  BEFORE UPDATE ON public.feria_commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
