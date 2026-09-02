# Devolver lotes de producción ya recibidos por inventario

Hoy, cuando inventario pulsa "Confirmar recepción" en un lote de producción, el lote pasa a estado `recibido`, se suma el stock y no existe ninguna acción para revertirlo (verificado en `BatchReceptionPanel.tsx` y en la función `receive_production_batch`, que solo avanza de `finalizado` a `recibido`). Si hubo un error o se confirmó el lote equivocado (por ejemplo trabajando dos lotes en paralelo), no hay retorno.

## Qué se va a construir

1. **Acción "Devolver a producción"** en el panel de recepción de inventario, disponible sobre los lotes ya recibidos (lista "Últimas recepciones").
2. **Motivo obligatorio**: al devolver, inventario escribe por qué (error de cantidad, lote equivocado, producto no conforme, etc.).
3. **Reversión del stock**: las unidades que se habían sumado al inventario se descuentan automáticamente con un movimiento inverso, quedando trazable en el historial de movimientos.
4. **El lote vuelve a producción**: regresa al estado "en proceso" para que producción lo revise, corrija y lo vuelva a finalizar. En el panel de producción se muestra un aviso de "Devuelto por inventario" con el motivo y la fecha.
5. **Notificación** al área de producción cuando ocurre una devolución.
6. **Trazabilidad**: la devolución queda registrada en el historial de cambios (auditoría de procesos) con usuario, fecha, cantidad revertida y motivo.

Solo los roles Inventarios y Administrador podrán devolver; producción no puede auto-devolverse un lote.

## Detalles técnicos

- **Migración**:
  - Nuevas columnas en `production_batches`: `return_reason text`, `returned_at timestamptz`, `returned_by uuid`, `returned_by_name text`, `return_count integer default 0`.
  - Nueva función `public.revert_production_batch_reception(_batch_id uuid, _reason text)` (SECURITY DEFINER, `search_path = public`), que:
    - exige rol `admin` o `inventarios` y motivo no vacío;
    - bloquea el lote con `FOR UPDATE` y valida que el estado sea `recibido` (idempotente: si ya no lo está, devuelve `ok:false` con mensaje);
    - inserta un movimiento inverso en `inventory_movements` (dirección de salida, área `produccion`, razón "Devolución de recepción lote #N: <motivo>") solo si se había recibido cantidad > 0 y hay `stock_item_id`;
    - actualiza el lote a `status = 'en_proceso'`, limpia `received_quantity/received_at/received_by/received_by_name`, guarda motivo/autor/fecha e incrementa `return_count`;
    - inserta una notificación para `produccion`;
    - `GRANT EXECUTE ... TO authenticated` y `REVOKE ... FROM PUBLIC, anon`.
  - Sin cambios de RLS: la función corre con SECURITY DEFINER y valida rol internamente.
- **Frontend**:
  - `src/hooks/useProductionBatches.ts`: nueva acción `revertReception(id, reason)` que llama al RPC y refresca la lista.
  - `src/components/inventory/BatchReceptionPanel.tsx`: botón "Devolver a producción" en cada recepción reciente + diálogo de confirmación con textarea de motivo y aviso de que se descontará el stock.
  - `src/components/production/ProductionBatchesPanel.tsx`: badge/aviso "Devuelto por inventario" con motivo y fecha en los lotes con `return_count > 0`.
  - Tipos de Supabase se regeneran tras la migración; el código que use las columnas nuevas se escribe después.
