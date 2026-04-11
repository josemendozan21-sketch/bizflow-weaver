-- Add payment-related columns to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_proof_url text DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_complete boolean DEFAULT false;

-- Add dispatch columns to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispatched_at date DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS transportadora text DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS numero_guia text DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispatch_notes text DEFAULT NULL;

-- RLS: Logistica can view all orders
CREATE POLICY "Logistica can view orders"
ON public.orders FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'logistica'::app_role));

-- RLS: Logistica can update orders (dispatch info)
CREATE POLICY "Logistica can update orders"
ON public.orders FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'logistica'::app_role))
WITH CHECK (has_role(auth.uid(), 'logistica'::app_role));

-- RLS: Logistica can view production orders
CREATE POLICY "Logistica can view production orders"
ON public.production_orders FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'logistica'::app_role));

-- Storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload payment proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Anyone can view payment proofs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-proofs');
