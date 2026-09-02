REVOKE EXECUTE ON FUNCTION public.validate_order_delivery() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_order_delivered() FROM PUBLIC, anon, authenticated;