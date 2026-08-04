DROP POLICY IF EXISTS "Contabilidad can create petty cash funds" ON public.petty_cash_funds;
DROP POLICY IF EXISTS "Contabilidad can update petty cash funds" ON public.petty_cash_funds;
DROP POLICY IF EXISTS "Contabilidad can delete petty cash funds" ON public.petty_cash_funds;
DROP POLICY IF EXISTS "Contabilidad can view petty cash funds" ON public.petty_cash_funds;
DROP POLICY IF EXISTS "Admin can manage petty cash funds" ON public.petty_cash_funds;
DROP POLICY IF EXISTS "Admin can manage petty cash expenses" ON public.petty_cash_expenses;
DROP POLICY IF EXISTS "Contabilidad can manage petty cash expenses" ON public.petty_cash_expenses;

CREATE POLICY "Finance can manage petty cash funds"
ON public.petty_cash_funds FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'contabilidad'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'contabilidad'));

CREATE POLICY "Finance can manage petty cash expenses"
ON public.petty_cash_expenses FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'contabilidad'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'contabilidad'));

CREATE POLICY "Read-only role can view petty cash funds"
ON public.petty_cash_funds FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'visualizador'));

CREATE POLICY "Read-only role can view petty cash expenses"
ON public.petty_cash_expenses FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'visualizador'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.petty_cash_funds TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.petty_cash_expenses TO authenticated;
GRANT ALL ON public.petty_cash_funds TO service_role;
GRANT ALL ON public.petty_cash_expenses TO service_role;