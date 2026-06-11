
-- 1) customers table
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document text UNIQUE,
  full_name text NOT NULL,
  phone text,
  email text,
  city text,
  address text,
  birth_date date,
  sport text,
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'activo',
  points_current integer NOT NULL DEFAULT 0,
  points_accumulated integer NOT NULL DEFAULT 0,
  tier text NOT NULL DEFAULT 'Bronze',
  last_redemption_at timestamptz,
  referred_by uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  referral_code text UNIQUE DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 8),
  purchase_count integer NOT NULL DEFAULT 0,
  total_spent numeric NOT NULL DEFAULT 0,
  avg_ticket numeric NOT NULL DEFAULT 0,
  first_purchase_at timestamptz,
  last_purchase_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customers_document_idx ON public.customers(document);
CREATE INDEX customers_phone_idx ON public.customers(phone);
CREATE INDEX customers_full_name_idx ON public.customers(lower(full_name));
CREATE INDEX customers_city_idx ON public.customers(city);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers viewable by staff" ON public.customers FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'contabilidad')
  OR public.has_role(auth.uid(), 'pos_punto')
  OR public.has_role(auth.uid(), 'asesor_comercial')
  OR public.has_role(auth.uid(), 'logistica')
);
CREATE POLICY "Customers insert by admin or pos" ON public.customers FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'pos_punto')
  OR public.has_role(auth.uid(), 'asesor_comercial')
);
CREATE POLICY "Customers update by admin or pos" ON public.customers FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'pos_punto')
  OR public.has_role(auth.uid(), 'asesor_comercial')
);
CREATE POLICY "Customers delete by admin" ON public.customers FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) preparatory loyalty tables
CREATE TABLE public.customer_loyalty_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('earn','redeem','adjust','expire')),
  points integer NOT NULL,
  sale_id uuid,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_loyalty_movements TO authenticated;
GRANT ALL ON public.customer_loyalty_movements TO service_role;
ALTER TABLE public.customer_loyalty_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Loyalty movements viewable by staff" ON public.customer_loyalty_movements FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contabilidad') OR public.has_role(auth.uid(),'pos_punto'));
CREATE POLICY "Loyalty movements managed by admin or pos" ON public.customer_loyalty_movements FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'pos_punto'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'pos_punto'));

CREATE TABLE public.customer_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','fixed')),
  discount_value numeric NOT NULL DEFAULT 0,
  valid_from date,
  valid_to date,
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_coupons TO authenticated;
GRANT ALL ON public.customer_coupons TO service_role;
ALTER TABLE public.customer_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coupons viewable by staff" ON public.customer_coupons FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contabilidad') OR public.has_role(auth.uid(),'pos_punto'));
CREATE POLICY "Coupons managed by admin" ON public.customer_coupons FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.loyalty_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  min_total_spent numeric NOT NULL DEFAULT 0,
  points_multiplier numeric NOT NULL DEFAULT 1,
  benefits text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_tiers TO authenticated;
GRANT ALL ON public.loyalty_tiers TO service_role;
ALTER TABLE public.loyalty_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tiers viewable by all auth" ON public.loyalty_tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Tiers managed by admin" ON public.loyalty_tiers FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.loyalty_tiers (name, min_total_spent, points_multiplier, display_order) VALUES
('Bronze', 0, 1, 1),
('Silver', 500000, 1.25, 2),
('Gold', 2000000, 1.5, 3),
('Platinum', 5000000, 2, 4);

CREATE TABLE public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  channel text,
  segment_filter jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_campaigns TO authenticated;
GRANT ALL ON public.marketing_campaigns TO service_role;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Campaigns managed by admin" ON public.marketing_campaigns FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 3) link pos_sales -> customers
ALTER TABLE public.pos_sales ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;
CREATE INDEX pos_sales_customer_id_idx ON public.pos_sales(customer_id);

-- 4) backfill: create customers from existing pos_sales by document
INSERT INTO public.customers (document, full_name, phone, email, city, address)
SELECT DISTINCT ON (client_document)
  client_document,
  COALESCE(NULLIF(client_name,''),'Cliente'),
  client_phone, client_email, client_city, client_address
FROM public.pos_sales
WHERE client_document IS NOT NULL AND client_document <> '' AND client_document <> '222222222222'
ORDER BY client_document, sale_date DESC
ON CONFLICT (document) DO NOTHING;

UPDATE public.pos_sales s SET customer_id = c.id
FROM public.customers c
WHERE s.client_document = c.document AND s.customer_id IS NULL;

-- 5) recalc trigger
CREATE OR REPLACE FUNCTION public.recalc_customer_metrics(_customer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cnt int; tot numeric; avgt numeric; firstp timestamptz; lastp timestamptz; new_status text;
BEGIN
  IF _customer_id IS NULL THEN RETURN; END IF;
  SELECT COUNT(*), COALESCE(SUM(total_amount),0), MIN(sale_date), MAX(sale_date)
    INTO cnt, tot, firstp, lastp
  FROM public.pos_sales WHERE customer_id = _customer_id;
  avgt := CASE WHEN cnt > 0 THEN tot/cnt ELSE 0 END;
  new_status := CASE WHEN lastp IS NULL OR lastp < (now() - interval '90 days') THEN 'inactivo' ELSE 'activo' END;
  UPDATE public.customers
     SET purchase_count = cnt, total_spent = tot, avg_ticket = avgt,
         first_purchase_at = firstp, last_purchase_at = lastp, status = new_status,
         updated_at = now()
   WHERE id = _customer_id;
END $$;

CREATE OR REPLACE FUNCTION public.trg_recalc_customer_on_sale()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_customer_metrics(OLD.customer_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.customer_id IS DISTINCT FROM OLD.customer_id THEN
      PERFORM public.recalc_customer_metrics(OLD.customer_id);
    END IF;
    PERFORM public.recalc_customer_metrics(NEW.customer_id);
    RETURN NEW;
  ELSE
    PERFORM public.recalc_customer_metrics(NEW.customer_id);
    RETURN NEW;
  END IF;
END $$;

CREATE TRIGGER trg_pos_sales_recalc_customer
AFTER INSERT OR UPDATE OR DELETE ON public.pos_sales
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_customer_on_sale();

-- 6) backfill metrics for existing customers
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.customers LOOP
    PERFORM public.recalc_customer_metrics(r.id);
  END LOOP;
END $$;
