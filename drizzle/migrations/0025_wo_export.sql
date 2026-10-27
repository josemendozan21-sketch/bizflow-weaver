CREATE TABLE public.wo_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  empresa text NOT NULL DEFAULT 'BIONOVATIONS SAS',
  prefijo text NOT NULL DEFAULT 'FEVC',
  bodega text NOT NULL DEFAULT 'Principal',
  credito_name text NOT NULL DEFAULT 'Crédito',
  contado_name text NOT NULL DEFAULT 'Contado',
  transfer_payment_name text NOT NULL DEFAULT 'Bancolombia 68',
  cash_payment_name text NOT NULL DEFAULT 'Caja General',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.wo_advisor_ids (
  advisor_id uuid PRIMARY KEY,
  wo_vendor_id text NOT NULL,
  label text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.wo_product_codes (
  app_product text PRIMARY KEY,
  wo_code text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.wo_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date date,
  order_count int NOT NULL DEFAULT 0,
  created_by uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.wo_export_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  export_id uuid NOT NULL REFERENCES public.wo_exports(id) ON DELETE CASCADE,
  order_id uuid NOT NULL,
  link_number int NOT NULL,
  status text NOT NULL DEFAULT 'exportado' CHECK (status IN ('exportado','confirmado','devuelto')),
  wo_invoice_number text,
  return_reason text,
  updated_by_name text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX wo_export_items_active_order ON public.wo_export_items(order_id) WHERE status <> 'devuelto';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wo_settings, public.wo_advisor_ids, public.wo_product_codes, public.wo_exports, public.wo_export_items TO authenticated;
GRANT ALL ON public.wo_settings, public.wo_advisor_ids, public.wo_product_codes, public.wo_exports, public.wo_export_items TO service_role;

ALTER TABLE public.wo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wo_advisor_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wo_product_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wo_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wo_export_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wo accounting" ON public.wo_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contabilidad')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contabilidad'));
CREATE POLICY "wo accounting" ON public.wo_advisor_ids FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contabilidad')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contabilidad'));
CREATE POLICY "wo accounting" ON public.wo_product_codes FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contabilidad')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contabilidad'));
CREATE POLICY "wo accounting" ON public.wo_exports FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contabilidad')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contabilidad'));
CREATE POLICY "wo accounting" ON public.wo_export_items FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contabilidad')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'contabilidad'));

INSERT INTO public.wo_settings (id) VALUES (1);
INSERT INTO public.wo_advisor_ids (advisor_id, wo_vendor_id, label) VALUES
 ('a19c301f-74ce-4764-96c2-6f314bdb3c81','1019055592','María del Pilar Beltrán'),
 ('e8a6ce11-9574-4fdb-8b47-a5e595502d3d','1019048349','Ángela María Mendoza'),
 ('b6d9d742-dc01-4350-9cd1-54b663b2f805','1020819808','María Valentina Mendoza'),
 ('fc46891a-192d-411b-9a2c-7e856357cf21','1031169923','Jailene Herrera'),
 ('c39bef2e-a9c2-49a7-8aa6-f663cca22320','1020780343','Jose Mario Mendoza');