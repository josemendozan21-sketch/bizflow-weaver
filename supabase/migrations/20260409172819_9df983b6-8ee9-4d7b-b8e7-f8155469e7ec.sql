
-- Create enum for logo request status
CREATE TYPE public.logo_request_status AS ENUM (
  'pendiente_diseno',
  'en_revision',
  'ajustado',
  'listo_aprobacion',
  'ajustes_solicitados',
  'aprobado',
  'finalizado'
);

-- Create logo_requests table
CREATE TABLE public.logo_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  brand TEXT NOT NULL,
  product TEXT NOT NULL,
  original_logo_url TEXT NOT NULL,
  client_comments TEXT,
  additional_instructions TEXT,
  advisor_id UUID NOT NULL,
  advisor_name TEXT NOT NULL,
  designer_id UUID,
  designer_name TEXT,
  adjusted_logo_url TEXT,
  design_notes TEXT,
  advisor_feedback TEXT,
  status public.logo_request_status NOT NULL DEFAULT 'pendiente_diseno',
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.logo_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage all logo requests"
ON public.logo_requests FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Advisors can create logo requests"
ON public.logo_requests FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'asesor_comercial') AND advisor_id = auth.uid());

CREATE POLICY "Authenticated users can view logo requests"
ON public.logo_requests FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Advisors can update their own requests"
ON public.logo_requests FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'asesor_comercial') AND advisor_id = auth.uid());

CREATE POLICY "Produccion can update logo requests"
ON public.logo_requests FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'produccion'));

-- Trigger for updated_at
CREATE TRIGGER update_logo_requests_updated_at
BEFORE UPDATE ON public.logo_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for logo files
INSERT INTO storage.buckets (id, name, public) VALUES ('logo-files', 'logo-files', true);

CREATE POLICY "Logo files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'logo-files');

CREATE POLICY "Authenticated users can upload logo files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logo-files');

CREATE POLICY "Authenticated users can update logo files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'logo-files');
