
-- Storage bucket for invoice files
INSERT INTO storage.buckets (id, name, public) VALUES ('invoice-files', 'invoice-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone authenticated can view invoice files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'invoice-files');

CREATE POLICY "Contabilidad and admin can upload invoice files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'invoice-files' AND (
    public.has_role(auth.uid(), 'contabilidad') OR
    public.has_role(auth.uid(), 'admin')
  )
);

-- Add invoice_file_url column to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoice_file_url text;
