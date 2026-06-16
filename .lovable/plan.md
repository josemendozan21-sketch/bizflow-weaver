## Objetivo
En **Inventarios → Bandeja de pedidos → Mayor**, los pedidos que ya fueron entregados a Estampación o que ya tienen una orden de producción de cuerpos activa deben desaparecer de la bandeja (no aparecer como "Entregados" ni duplicados como los que se ven en la captura).

## Cambio
Archivo: `src/components/inventory/WholesaleOrdersInbox.tsx`

1. En la query `mayor-orders-inbox`, mantener el filtro por `sale_type=mayor` y `production_status != despachado`.
2. Usar `orderStates.deliveredIds` (que ya incluye tanto movimientos de entrega como tareas de producción de cuerpos activas) para **excluir** esos pedidos de la lista renderizada en lugar de mostrarlos en una sección "Entregados".
3. Eliminar la sección visual de "Entregados" del tab Mayor (y su grid correspondiente), dejando solo `pending`.
4. Si un pedido vuelve a aparecer porque Producción finalizó cuerpos (`producedIds`), se sigue mostrando para que Inventarios pueda entregarlo a Estampación (lógica ya existente: `producedIds` se descarta de `deliveredIds` solo si no hay entrega previa).

## Detalle técnico
- `pending` ya está calculado: `orders.filter(o => !deliveredIds.has(o.id))`.
- Quitar el bloque que renderiza `delivered.map(...)` y su encabezado en la vista `mayor`.
- No tocar la pestaña Detal ni la lógica de Sweatspot por kit.
- No se modifica base de datos: los pedidos siguen existiendo, solo se ocultan de la bandeja cuando ya están en proceso.