
-- Bank accounts
CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  initial_balance numeric NOT NULL DEFAULT 0,
  current_balance numeric NOT NULL DEFAULT 0,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/contabilidad manage bank_accounts"
ON public.bank_accounts FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role));

CREATE POLICY "Authenticated view bank_accounts"
ON public.bank_accounts FOR SELECT TO authenticated USING (true);

CREATE TRIGGER trg_bank_accounts_updated_at
BEFORE UPDATE ON public.bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bank movements
CREATE TABLE public.bank_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  movement_date date NOT NULL DEFAULT (now())::date,
  direction text NOT NULL CHECK (direction IN ('ingreso','egreso')),
  amount numeric NOT NULL CHECK (amount >= 0),
  concept text NOT NULL,
  reference_kind text,
  reference_id uuid,
  recorded_by uuid,
  recorded_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/contabilidad manage bank_movements"
ON public.bank_movements FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role));

CREATE POLICY "Authenticated view bank_movements"
ON public.bank_movements FOR SELECT TO authenticated USING (true);

-- Trigger to update bank account balance
CREATE OR REPLACE FUNCTION public.apply_bank_movement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.bank_accounts
       SET current_balance = current_balance + (CASE WHEN NEW.direction = 'ingreso' THEN NEW.amount ELSE -NEW.amount END)
     WHERE id = NEW.bank_account_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.bank_accounts
       SET current_balance = current_balance - (CASE WHEN OLD.direction = 'ingreso' THEN OLD.amount ELSE -OLD.amount END)
     WHERE id = OLD.bank_account_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_apply_bank_movement_ins
AFTER INSERT ON public.bank_movements
FOR EACH ROW EXECUTE FUNCTION public.apply_bank_movement();

CREATE TRIGGER trg_apply_bank_movement_del
AFTER DELETE ON public.bank_movements
FOR EACH ROW EXECUTE FUNCTION public.apply_bank_movement();

-- When initial_balance changes, sync current_balance offset
CREATE OR REPLACE FUNCTION public.sync_bank_initial_balance()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.current_balance := COALESCE(NEW.current_balance, 0) + COALESCE(NEW.initial_balance, 0);
    -- avoid double when caller already set current_balance explicitly equal to initial
  ELSIF TG_OP = 'UPDATE' AND NEW.initial_balance IS DISTINCT FROM OLD.initial_balance THEN
    NEW.current_balance := NEW.current_balance + (NEW.initial_balance - OLD.initial_balance);
  END IF;
  RETURN NEW;
END;
$$;

-- Note: only apply on UPDATE to avoid messing up INSERT seed
CREATE TRIGGER trg_sync_bank_initial_balance
BEFORE UPDATE ON public.bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.sync_bank_initial_balance();

-- Scheduled payments
CREATE TABLE public.scheduled_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid REFERENCES public.monthly_budgets(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('costo','gasto','pasivo')),
  category text NOT NULL,
  description text,
  budgeted_amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','pagado','cancelado')),
  paid_amount numeric,
  paid_date date,
  paid_bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  proof_url text,
  notes text,
  budget_entry_id uuid,
  bank_movement_id uuid,
  created_by uuid,
  created_by_name text,
  paid_by uuid,
  paid_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/contabilidad manage scheduled_payments"
ON public.scheduled_payments FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role));

CREATE POLICY "Authenticated view scheduled_payments"
ON public.scheduled_payments FOR SELECT TO authenticated USING (true);

CREATE TRIGGER trg_scheduled_payments_updated_at
BEFORE UPDATE ON public.scheduled_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial bank accounts
INSERT INTO public.bank_accounts (name, initial_balance, current_balance) VALUES
  ('Bancolombia 68', 0, 0),
  ('Bancolombia 36', 0, 0),
  ('Davivienda', 0, 0),
  ('Nequi', 0, 0),
  ('Efectivo', 0, 0),
  ('Fiducuenta', 0, 0);

-- Add bank_account_id to budget_entries for tracking
ALTER TABLE public.budget_entries ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL;
