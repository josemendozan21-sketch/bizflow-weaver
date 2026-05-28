
CREATE TABLE public.company_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'otros',
  description TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID,
  uploaded_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_documents TO authenticated;
GRANT ALL ON public.company_documents TO service_role;

ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view company_documents"
ON public.company_documents FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admin/asesor/contabilidad manage company_documents"
ON public.company_documents FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'asesor_comercial'::app_role)
  OR has_role(auth.uid(), 'contabilidad'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'asesor_comercial'::app_role)
  OR has_role(auth.uid(), 'contabilidad'::app_role)
);

CREATE TRIGGER update_company_documents_updated_at
BEFORE UPDATE ON public.company_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public) VALUES ('company-documents', 'company-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated can read company-documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'company-documents');

CREATE POLICY "Admin/asesor/contabilidad upload company-documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'company-documents' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'asesor_comercial'::app_role)
    OR has_role(auth.uid(), 'contabilidad'::app_role)
  )
);

CREATE POLICY "Admin/asesor/contabilidad update company-documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'company-documents' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'asesor_comercial'::app_role)
    OR has_role(auth.uid(), 'contabilidad'::app_role)
  )
);

CREATE POLICY "Admin/asesor/contabilidad delete company-documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'company-documents' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'asesor_comercial'::app_role)
    OR has_role(auth.uid(), 'contabilidad'::app_role)
  )
);
