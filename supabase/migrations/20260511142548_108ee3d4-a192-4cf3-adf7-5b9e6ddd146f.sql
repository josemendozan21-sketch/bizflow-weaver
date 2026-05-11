
-- Recreate missing triggers for inventory request approval flow and movements
DROP TRIGGER IF EXISTS trg_process_inventory_request_approval ON public.inventory_requests;
CREATE TRIGGER trg_process_inventory_request_approval
BEFORE UPDATE ON public.inventory_requests
FOR EACH ROW
EXECUTE FUNCTION public.process_inventory_request_approval();

DROP TRIGGER IF EXISTS trg_notify_new_inventory_request ON public.inventory_requests;
CREATE TRIGGER trg_notify_new_inventory_request
AFTER INSERT ON public.inventory_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_inventory_request();

DROP TRIGGER IF EXISTS trg_process_inventory_movement ON public.inventory_movements;
CREATE TRIGGER trg_process_inventory_movement
BEFORE INSERT ON public.inventory_movements
FOR EACH ROW
EXECUTE FUNCTION public.process_inventory_movement();

DROP TRIGGER IF EXISTS trg_auto_create_body_task_on_low_stock ON public.stock_items;
CREATE TRIGGER trg_auto_create_body_task_on_low_stock
AFTER UPDATE ON public.stock_items
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_body_task_on_low_stock();

DROP TRIGGER IF EXISTS trg_auto_create_body_task_for_production_order ON public.production_orders;
CREATE TRIGGER trg_auto_create_body_task_for_production_order
AFTER INSERT ON public.production_orders
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_body_task_for_production_order();

DROP TRIGGER IF EXISTS trg_validate_supply_order ON public.production_supply_orders;
CREATE TRIGGER trg_validate_supply_order
BEFORE INSERT OR UPDATE ON public.production_supply_orders
FOR EACH ROW
EXECUTE FUNCTION public.validate_supply_order();
