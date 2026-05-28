
DROP POLICY IF EXISTS "Authenticated view bank_accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Authenticated view bank_movements" ON public.bank_movements;
DROP POLICY IF EXISTS "Authenticated view scheduled_payments" ON public.scheduled_payments;

ALTER FUNCTION public.sync_bank_initial_balance() SET search_path = public;
