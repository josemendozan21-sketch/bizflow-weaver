# Verificación de la corrección + Historial de cambios reutilizable

## 1. Verificación de la corrección (duplicación de cuerpos / solicitudes que desaparecen)

Lo revisado en el código y en la base de datos:

- `MovementHistoryTable.tsx` vuelve a leer `reception_confirmed` antes de confirmar y ya no escribe en `body_stock` (solo crea la fila si no existe); los triggers espejo son los únicos que sincronizan. Esto elimina el doble conteo.
- `useProductionOrders.ts` ya no escribe cantidades producidas directamente en `body_stock` (ruta legado deshabilitada con comentario).
- La marca (`brand`) se guarda al crear tareas de producción: las 81 tareas existentes tienen marca asignada, así que ninguna queda fuera del filtro por marca de Magical/Sweatspot.
- La función de auditoría de inventario ya ignora ejecuciones anidadas (`pg_trigger_depth() > 1`), por lo que una edición genera un solo registro.

Pendiente para cerrar la verificación (parte de esta entrega):

- Prueba real en el navegador: crear una solicitud de cuerpos desde Inventario, recibirla desde Producción y confirmar recepción, comparando el saldo antes/después para probar que suma una sola vez y que la tarea no desaparece.
- Confirmar que una segunda confirmación de la misma recepción no vuelve a sumar.

Si la prueba muestra algo distinto, se corrige en la misma entrega y se reporta.

## 2. Historial de cambios como componente reutilizable

Objetivo: el mismo panel de "Historial de cambios" que ya funciona en Inventario, disponible en Producción, Estampación y demás procesos, con la misma apariencia y reglas (inmutable, con usuario, fecha/hora, campo, valor anterior y nuevo).

Alcance de lo que se audita:

- Órdenes de producción: cambios de etapa/estado, cantidades producidas, fechas, asignaciones.
- Tareas de cuerpos: creación, unidades, marca, finalización y recepción.
- Estampación: inicio, avance y finalización de tareas, cantidades estampadas.
- Cortes de rollo y registros de etapa (logs de proceso).

Qué verá el usuario:

- Una pestaña "Historial de cambios" en Producción y en Estampación (visible también para administrador), idéntica en filtros y exportación a la de Inventario: búsqueda, usuario, tipo de acción, marca, rango de fechas y descarga a Excel.
- Cada línea indica: fecha y hora, usuario, área/proceso, número de pedido, elemento afectado, campo cambiado, valor anterior y valor nuevo.
- El registro no se puede editar ni borrar desde la aplicación.

## Detalles técnicos

1. Nueva tabla `public.process_audit_log` (inmutable): `area` (produccion | estampacion | inventario), `table_name`, `record_id`, `order_code`, `entity_name`, `brand`, `action`, `field`, `old_value`, `new_value`, `changed_by`, `changed_by_email`, `changed_at`, con GRANT explícitos, RLS de solo lectura para roles autorizados (admin, produccion, estampacion, inventarios) y sin políticas de update/delete.
2. Función `public.log_process_change()` (SECURITY DEFINER) con la misma lógica campo-a-campo de `log_inventory_change()`, incluyendo el guardado contra triggers anidados (`pg_trigger_depth() > 1`).
3. Triggers sobre `production_orders`, `body_production_tasks`, `production_stage_logs` y `roll_cuts`.
4. Refactor de la UI: extraer `src/components/shared/ChangeLogPanel.tsx` (tabla, filtros, badges, export a Excel) parametrizado por fuente de datos y etiquetas de campo. `InventoryChangeLogPanel` pasa a ser un envoltorio del componente compartido, sin cambios visibles ni pérdida de la deduplicación actual del espejo `stock_items`/`body_stock`.
5. Hook `useProcessAuditLog(area)` análogo a `useInventoryAuditLog`.
6. Montaje de la pestaña en las vistas de Producción y Estampación con control por rol.
7. Verificación final: typecheck, build y prueba en navegador del flujo de recepción y de que los cambios de producción/estampación quedan registrados una sola vez.
