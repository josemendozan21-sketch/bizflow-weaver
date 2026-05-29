CREATE POLICY "Authorized roles update payment proofs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'payment-proofs' AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'contabilidad') OR has_role(auth.uid(),'asesor_comercial')))
WITH CHECK (bucket_id = 'payment-proofs' AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'contabilidad') OR has_role(auth.uid(),'asesor_comercial')));