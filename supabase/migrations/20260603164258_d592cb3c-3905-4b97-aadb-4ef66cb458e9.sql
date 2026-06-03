UPDATE public.orders
SET production_status = 'listo'
WHERE id = '6ef117ec-1884-4e80-a028-67892b8b2e56'
  AND production_status = 'pendiente';