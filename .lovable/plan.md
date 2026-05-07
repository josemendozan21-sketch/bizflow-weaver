## Dónde se ven hoy

Las ventas al detal **ya llegan a Inventarios → Recepción de pedidos → Solicitudes pendientes** (cada línea de un pedido al detal crea una solicitud con motivo "Pedido al detal de [cliente]"). Pero quedan mezcladas con las solicitudes mayoristas y las de producción/estampación, por eso no se notan.

## Cambios propuestos

1. **Identificar visualmente las ventas al detal** en el panel de Solicitudes:
   - Nueva columna o badge "Origen": `Detal`, `Mayor`, `Producción`, `Estampación`, `Logística`, `Asesor`.
   - Las de detal con badge destacado (color distinto) para que Inventarios las reconozca al instante.

2. **Filtro rápido en la cabecera** del panel:
   - Chips: `Todas` · `Ventas al detal` · `Ventas al por mayor` · `Pedidos internos`.
   - Contador por chip.

3. **Mostrar cliente en la fila** cuando es venta (extraer del `reason` o consultar el `order_id` para traer `client_name` y `client_city`), para que Inventarios sepa a quién va dirigido antes de aprobar.

4. **Acción "Procesar"**: sin cambios de lógica — al aprobar una venta al detal, descuenta stock y notifica a Logística (que ya recibe el pedido). Solo mejoramos la visibilidad.

5. **Pestaña "Mis pedidos" del asesor** ya muestra el estado; no se toca.

## Archivos a tocar
- `src/components/inventory/InventoryRequestsPanel.tsx` — columna Origen, filtros, cliente.
- `src/hooks/useInventoryRequests.ts` — opcional: join ligero con `orders` para `sale_type` y `client_name` cuando hay `order_id`.

Sin migraciones de base de datos.