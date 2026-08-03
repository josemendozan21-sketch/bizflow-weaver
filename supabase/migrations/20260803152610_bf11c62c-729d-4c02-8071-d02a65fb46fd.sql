GRANT SELECT, INSERT, UPDATE, DELETE ON public.petty_cash_funds TO authenticated;
GRANT ALL ON public.petty_cash_funds TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.petty_cash_expenses TO authenticated;
GRANT ALL ON public.petty_cash_expenses TO service_role;