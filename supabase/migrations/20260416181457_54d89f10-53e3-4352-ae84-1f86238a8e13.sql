
-- Tabla de personal asignado por feria
CREATE TABLE public.feria_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feria_id UUID NOT NULL REFERENCES public.ferias(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  document_id TEXT,
  phone TEXT,
  role TEXT,
  arl_provider TEXT,
  arl_document_url TEXT,
  arl_valid_until DATE,
  emergency_contact TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feria_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view feria staff"
  ON public.feria_staff FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authorized roles can manage feria staff"
  ON public.feria_staff FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role) OR has_role(auth.uid(), 'logistica'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role) OR has_role(auth.uid(), 'logistica'::app_role));

CREATE TRIGGER update_feria_staff_updated_at
  BEFORE UPDATE ON public.feria_staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bucket privado para documentos ARL del personal
INSERT INTO storage.buckets (id, name, public) VALUES ('feria-staff-docs', 'feria-staff-docs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authorized roles can view feria staff docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'feria-staff-docs' AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'contabilidad'::app_role) OR
    has_role(auth.uid(), 'logistica'::app_role)
  ));

CREATE POLICY "Authorized roles can upload feria staff docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'feria-staff-docs' AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'contabilidad'::app_role) OR
    has_role(auth.uid(), 'logistica'::app_role)
  ));

CREATE POLICY "Authorized roles can update feria staff docs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'feria-staff-docs' AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'contabilidad'::app_role) OR
    has_role(auth.uid(), 'logistica'::app_role)
  ));

CREATE POLICY "Authorized roles can delete feria staff docs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'feria-staff-docs' AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'contabilidad'::app_role) OR
    has_role(auth.uid(), 'logistica'::app_role)
  ));
