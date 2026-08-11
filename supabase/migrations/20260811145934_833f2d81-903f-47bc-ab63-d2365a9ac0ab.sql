DELETE FROM public.order_payments WHERE order_id = '2c1b2a2c-ae7f-4a54-8d0e-f63f5fdb8a75';
DELETE FROM public.orders WHERE id = '2c1b2a2c-ae7f-4a54-8d0e-f63f5fdb8a75';
DELETE FROM public.logo_requests WHERE client_name ILIKE '%diagnostico por imagenes%';