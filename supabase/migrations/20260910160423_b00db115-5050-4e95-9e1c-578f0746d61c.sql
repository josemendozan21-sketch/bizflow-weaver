CREATE TABLE public.logo_reference_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_request_id uuid REFERENCES public.logo_requests(id) ON DELETE CASCADE,
  order_id uuid,
  file_url text NOT NULL,
  file_name text,
  file_type text,
  stage text NOT NULL DEFAULT 'creacion',
  note text,
  uploaded_by uuid,
  uploaded_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.logo_reference_files TO authenticated;
GRANT ALL ON public.logo_reference_files TO service_role;

ALTER TABLE public.logo_reference_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Diseño, admin y asesor dueño pueden ver referencias"
ON public.logo_reference_files FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'disenador')
  OR uploaded_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.logo_requests lr
    WHERE lr.id = logo_reference_files.logo_request_id
      AND lr.advisor_id = auth.uid()
  )
);

CREATE POLICY "Usuarios autenticados pueden adjuntar referencias"
ON public.logo_reference_files FOR INSERT TO authenticated
WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Autor o admin pueden eliminar referencias"
ON public.logo_reference_files FOR DELETE TO authenticated
USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_logo_reference_files_request ON public.logo_reference_files(logo_request_id);
CREATE INDEX idx_logo_reference_files_order ON public.logo_reference_files(order_id);