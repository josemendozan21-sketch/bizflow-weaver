ALTER TABLE public.pos_sales ADD COLUMN IF NOT EXISTS payment_proof_url text;

CREATE POLICY "POS asesor updates own pos_sales"
ON public.pos_sales
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'pos_punto'::app_role) AND is_pos_for_location(location_id) AND recorded_by = auth.uid())
WITH CHECK (has_role(auth.uid(), 'pos_punto'::app_role) AND is_pos_for_location(location_id) AND recorded_by = auth.uid());

CREATE POLICY "Contabilidad updates pos_sales"
ON public.pos_sales
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'contabilidad'::app_role))
WITH CHECK (has_role(auth.uid(), 'contabilidad'::app_role));