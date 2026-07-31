CREATE POLICY "Contabilidad can update petty cash funds"
ON public.petty_cash_funds FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'contabilidad'::app_role))
WITH CHECK (has_role(auth.uid(), 'contabilidad'::app_role));

CREATE POLICY "Contabilidad can delete petty cash funds"
ON public.petty_cash_funds FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'contabilidad'::app_role));