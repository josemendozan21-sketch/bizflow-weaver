CREATE TABLE public.roll_cuts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  tipo text NOT NULL CHECK (tipo IN ('calor','frio')),
  medida_cm numeric NOT NULL,
  peso_inicial_g numeric NOT NULL,
  peso_final_g numeric,
  status text NOT NULL DEFAULT 'disponible' CHECK (status IN ('disponible','en_uso','consumido')),
  cortado_por text NOT NULL,
  cortado_at timestamp with time zone NOT NULL DEFAULT now(),
  montado_por text,
  montado_at timestamp with time zone,
  notas_inicio text,
  finalizado_por text,
  finalizado_at timestamp with time zone,
  notas_final text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.roll_cuts TO authenticated;
GRANT ALL ON public.roll_cuts TO service_role;

ALTER TABLE public.roll_cuts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage roll_cuts" ON public.roll_cuts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Produccion manages roll_cuts" ON public.roll_cuts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'produccion'::app_role))
  WITH CHECK (has_role(auth.uid(), 'produccion'::app_role));

CREATE POLICY "Inventarios manages roll_cuts" ON public.roll_cuts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'inventarios'::app_role))
  WITH CHECK (has_role(auth.uid(), 'inventarios'::app_role));

CREATE POLICY "Authenticated view roll_cuts" ON public.roll_cuts
  FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_roll_cuts_updated_at
  BEFORE UPDATE ON public.roll_cuts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_roll_cuts_status ON public.roll_cuts(status);
CREATE INDEX idx_roll_cuts_tipo ON public.roll_cuts(tipo);