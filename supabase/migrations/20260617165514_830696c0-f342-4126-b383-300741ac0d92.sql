ALTER TABLE public.ferias
  ADD COLUMN budget_stand_cost numeric DEFAULT 0,
  ADD COLUMN budget_shipping_cost numeric DEFAULT 0,
  ADD COLUMN budget_tickets_cost numeric DEFAULT 0,
  ADD COLUMN budget_advertising_cost numeric DEFAULT 0,
  ADD COLUMN budget_merchandise_cost numeric DEFAULT 0,
  ADD COLUMN budget_employees_cost numeric DEFAULT 0,
  ADD COLUMN budget_lodging_cost numeric DEFAULT 0,
  ADD COLUMN budget_transport_cost numeric DEFAULT 0,
  ADD COLUMN budget_food_cost numeric DEFAULT 0,
  ADD COLUMN budget_other_costs numeric DEFAULT 0;