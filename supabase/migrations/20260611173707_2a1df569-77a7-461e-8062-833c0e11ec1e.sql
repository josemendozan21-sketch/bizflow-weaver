CREATE POLICY "Estampacion can finalize approved logo requests"
ON public.logo_requests
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'estampacion'::public.app_role)
  AND status = 'aprobado'
)
WITH CHECK (
  public.has_role(auth.uid(), 'estampacion'::public.app_role)
  AND status = 'finalizado'
);