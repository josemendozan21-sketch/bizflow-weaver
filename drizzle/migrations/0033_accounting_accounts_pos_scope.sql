ALTER TABLE public.accounting_accounts ADD COLUMN IF NOT EXISTS pos_location_id uuid REFERENCES public.pos_locations(id) ON DELETE CASCADE;
ALTER TABLE public.accounting_accounts DROP CONSTRAINT IF EXISTS accounting_accounts_group_code_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS accounting_accounts_scope_group_name_key ON public.accounting_accounts (pos_location_id, group_code, name) NULLS NOT DISTINCT;
CREATE INDEX IF NOT EXISTS idx_accounting_accounts_pos ON public.accounting_accounts (pos_location_id);