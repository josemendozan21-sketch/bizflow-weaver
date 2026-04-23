-- Tabla galería de productos terminados
CREATE TABLE public.product_gallery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL,
  product_name TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  client_name TEXT,
  logo_reference TEXT,
  notes TEXT,
  uploaded_by UUID NOT NULL,
  uploaded_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_gallery_brand_product ON public.product_gallery(brand, product_name);
CREATE INDEX idx_product_gallery_created_at ON public.product_gallery(created_at DESC);

ALTER TABLE public.product_gallery ENABLE ROW LEVEL SECURITY;

-- Cualquier autenticado puede ver
CREATE POLICY "Authenticated can view gallery"
ON public.product_gallery FOR SELECT TO authenticated
USING (true);

-- Roles operativos pueden subir
CREATE POLICY "Operational roles can insert gallery"
ON public.product_gallery FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid() AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'produccion'::app_role) OR
    has_role(auth.uid(), 'estampacion'::app_role) OR
    has_role(auth.uid(), 'logistica'::app_role) OR
    has_role(auth.uid(), 'disenador'::app_role)
  )
);

-- Subidor puede actualizar/eliminar sus propias fotos
CREATE POLICY "Uploaders can update own photos"
ON public.product_gallery FOR UPDATE TO authenticated
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Uploaders can delete own photos"
ON public.product_gallery FOR DELETE TO authenticated
USING (uploaded_by = auth.uid());

-- Admin gestiona todo
CREATE POLICY "Admin manages gallery"
ON public.product_gallery FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_product_gallery_updated_at
BEFORE UPDATE ON public.product_gallery
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bucket de storage público
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-gallery', 'product-gallery', true);

-- Políticas storage
CREATE POLICY "Public can view product gallery files"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-gallery');

CREATE POLICY "Operational roles can upload gallery files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-gallery' AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'produccion'::app_role) OR
    has_role(auth.uid(), 'estampacion'::app_role) OR
    has_role(auth.uid(), 'logistica'::app_role) OR
    has_role(auth.uid(), 'disenador'::app_role)
  )
);

CREATE POLICY "Authenticated can delete own gallery files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-gallery' AND auth.uid()::text = (storage.foldername(name))[1]);
