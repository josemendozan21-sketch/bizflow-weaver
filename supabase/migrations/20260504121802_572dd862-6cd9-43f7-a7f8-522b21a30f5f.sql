CREATE POLICY "Logistica can upload guide files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invoice-files'
  AND has_role(auth.uid(), 'logistica'::app_role)
);

CREATE POLICY "Logistica can update guide files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'invoice-files'
  AND has_role(auth.uid(), 'logistica'::app_role)
);