
CREATE POLICY "Admins can delete orders"
ON public.orders
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
