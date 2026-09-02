CREATE TABLE public.process_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  order_code text,
  entity_name text,
  brand text,
  action text NOT NULL,
  field text,
  old_value text,
  new_value text,
  changed_by uuid,
  changed_by_email text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.process_audit_log TO authenticated;
GRANT ALL ON public.process_audit_log TO service_role;

ALTER TABLE public.process_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roles autorizados pueden ver el historial de procesos"
ON public.process_audit_log FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'produccion')
  OR public.has_role(auth.uid(), 'estampacion')
  OR public.has_role(auth.uid(), 'inventarios')
  OR public.has_role(auth.uid(), 'contabilidad')
  OR public.has_role(auth.uid(), 'visualizador')
);

CREATE INDEX idx_process_audit_changed_at ON public.process_audit_log (changed_at DESC);
CREATE INDEX idx_process_audit_area ON public.process_audit_log (area);
CREATE INDEX idx_process_audit_order_code ON public.process_audit_log (order_code);

CREATE OR REPLACE FUNCTION public.log_process_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  uemail text;
  f text;
  fields text[];
  oldv text;
  newv text;
  rec jsonb;
  v_area text;
  v_name text;
  v_brand text;
  v_code text;
  v_action text;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT email INTO uemail FROM public.profiles WHERE user_id = uid LIMIT 1;

  rec := to_jsonb(COALESCE(NEW, OLD));

  IF TG_TABLE_NAME = 'production_orders' THEN
    v_area := CASE WHEN (rec->>'current_stage') ILIKE '%estamp%' THEN 'estampacion' ELSE 'produccion' END;
    fields := ARRAY['current_stage','stage_status','quantity','final_count','delivery_date','packager_name','gel_color','ink_color','ink_color_2','ink_color_3','glitter_color','molde','thermo_size','silicone_color','logo_type','observations','needs_cuerpos','has_stock','stamp_size_status','stamp_inkgel_status','completed_at'];
    v_name := COALESCE(rec->>'client_name','—');
    v_brand := rec->>'brand';
    v_code := rec->>'order_code';
  ELSIF TG_TABLE_NAME = 'body_production_tasks' THEN
    v_area := 'produccion';
    fields := ARRAY['status','unidades','referencia','tipo_plastico','brand','fabricated_by','completed_at'];
    v_name := COALESCE(rec->>'referencia','Cuerpos');
    v_brand := rec->>'brand';
    SELECT o.order_code INTO v_code FROM public.orders o WHERE o.id = (rec->>'order_id')::uuid;
  ELSIF TG_TABLE_NAME = 'production_stage_logs' THEN
    v_area := CASE WHEN (rec->>'stage') ILIKE '%estamp%' THEN 'estampacion' ELSE 'produccion' END;
    fields := ARRAY['stage','operator_name','started_at','ended_at'];
    v_name := COALESCE(rec->>'stage','Etapa');
    SELECT po.brand, po.order_code INTO v_brand, v_code
      FROM public.production_orders po WHERE po.id = (rec->>'production_order_id')::uuid;
  ELSE
    v_area := 'produccion';
    fields := ARRAY['status','tipo','medida_cm','peso_inicial_g','peso_final_g','cortado_por','montado_por','finalizado_por','notas_inicio','notas_final'];
    v_name := COALESCE(rec->>'code','Corte de rollo');
    v_brand := 'magical_warmers';
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.process_audit_log (area, table_name, record_id, order_code, entity_name, brand, action, field, old_value, new_value, changed_by, changed_by_email)
    VALUES (v_area, TG_TABLE_NAME, (rec->>'id')::uuid, v_code, v_name, v_brand, 'eliminacion', 'registro', 'existente', NULL, uid, uemail);
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.process_audit_log (area, table_name, record_id, order_code, entity_name, brand, action, field, old_value, new_value, changed_by, changed_by_email)
    VALUES (v_area, TG_TABLE_NAME, (rec->>'id')::uuid, v_code, v_name, v_brand, 'creacion', 'registro', NULL, COALESCE(rec->>'status', rec->>'current_stage', rec->>'stage', 'creado'), uid, uemail);
    RETURN NEW;
  END IF;

  FOREACH f IN ARRAY fields LOOP
    oldv := to_jsonb(OLD)->>f;
    newv := to_jsonb(NEW)->>f;
    IF oldv IS DISTINCT FROM newv THEN
      INSERT INTO public.process_audit_log (area, table_name, record_id, order_code, entity_name, brand, action, field, old_value, new_value, changed_by, changed_by_email)
      VALUES (v_area, TG_TABLE_NAME, (rec->>'id')::uuid, v_code, v_name, v_brand, 'edicion', f, oldv, newv, uid, uemail);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_production_orders_changes
AFTER INSERT OR UPDATE OR DELETE ON public.production_orders
FOR EACH ROW EXECUTE FUNCTION public.log_process_change();

CREATE TRIGGER trg_log_body_tasks_changes
AFTER INSERT OR UPDATE OR DELETE ON public.body_production_tasks
FOR EACH ROW EXECUTE FUNCTION public.log_process_change();

CREATE TRIGGER trg_log_stage_logs_changes
AFTER INSERT OR UPDATE OR DELETE ON public.production_stage_logs
FOR EACH ROW EXECUTE FUNCTION public.log_process_change();

CREATE TRIGGER trg_log_roll_cuts_changes
AFTER INSERT OR UPDATE OR DELETE ON public.roll_cuts
FOR EACH ROW EXECUTE FUNCTION public.log_process_change();