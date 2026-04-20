
INSERT INTO public.logo_requests (
  brand, client_name, product, advisor_id, advisor_name,
  original_logo_url, status, additional_instructions
)
SELECT DISTINCT ON (o.client_name, o.brand, o.product)
  CASE WHEN o.brand = 'magical' THEN 'Magical Warmers' ELSE 'Sweatspot' END,
  o.client_name,
  o.product,
  o.advisor_id,
  o.advisor_name,
  'https://placehold.co/600x400/e2e8f0/64748b?text=Recompra+-+Solicitar+logo+al+asesor',
  'pendiente_diseno'::logo_request_status,
  'Pedido de recompra existente. El logo no se cargó en el sistema; contactar al asesor (' || o.advisor_name || ') para obtener el archivo del logo.'
FROM public.orders o
WHERE o.is_recompra = true
  AND o.logo_url = 'recompra-logo'
  AND NOT EXISTS (
    SELECT 1 FROM public.logo_requests lr
    WHERE LOWER(lr.client_name) = LOWER(o.client_name)
      AND lr.brand = CASE WHEN o.brand = 'magical' THEN 'Magical Warmers' ELSE 'Sweatspot' END
  );

INSERT INTO public.notifications (target_role, title, message, type)
SELECT 'disenador'::app_role,
       'Solicitudes de recompra pendientes',
       'Se agregaron solicitudes de diseño retroactivas para pedidos de recompra. Revisa el panel y contacta al asesor para obtener los logos.',
       'recompra_retroactiva'
WHERE EXISTS (
  SELECT 1 FROM public.logo_requests
  WHERE additional_instructions LIKE 'Pedido de recompra existente.%'
);
