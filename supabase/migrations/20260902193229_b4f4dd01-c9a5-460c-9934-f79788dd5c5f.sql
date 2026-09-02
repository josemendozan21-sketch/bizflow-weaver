REVOKE EXECUTE ON FUNCTION public.confirm_order_requirement(uuid, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.start_production_batch(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.finish_production_batch(uuid, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.receive_production_batch(uuid, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_order_requirement() FROM PUBLIC, anon, authenticated;