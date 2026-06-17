
-- Fix mutable search_path on SECURITY DEFINER functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = pgmq, public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = pgmq, public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = pgmq, public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = pgmq, public;

-- Add UPDATE policy for budget-receipts bucket
CREATE POLICY "Admin and contabilidad update budget receipts"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'budget-receipts' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role)))
WITH CHECK (bucket_id = 'budget-receipts' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role)));

-- Add DELETE policy for pos-cash-proofs bucket
CREATE POLICY "Admin and contabilidad delete pos cash proofs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'pos-cash-proofs' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilidad'::app_role)));
