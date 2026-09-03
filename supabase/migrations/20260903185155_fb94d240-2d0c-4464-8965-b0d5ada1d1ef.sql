CREATE OR REPLACE FUNCTION public.create_initial_abono_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF COALESCE(NEW.abono, 0) > 0 THEN
    INSERT INTO public.order_payments (order_id, amount, payment_date, proof_url, notes)
    VALUES (
      NEW.id,
      LEAST(NEW.abono, COALESCE(NULLIF(NEW.total_amount, 0), NEW.abono)),
      COALESCE(NEW.payment_date, CURRENT_DATE),
      NEW.payment_proof_url,
      'Abono inicial registrado al crear el pedido'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_initial_abono_payment ON public.orders;
CREATE TRIGGER trg_create_initial_abono_payment
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.create_initial_abono_payment();