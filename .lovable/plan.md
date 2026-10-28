# Mostrar el color de escarcha en Producción

## Qué pasa
El pedido de Óptica Ocampo (MW-PB-01483) tiene guardada "Escarcha Dorada" en la venta, pero la orden de producción quedó sin ese dato. Producción solo muestra la escarcha si la orden de producción la tiene, por eso Pilar la ve y Producción no. Hoy hay **17 órdenes de producción** en la misma situación.

## Qué haré
1. Copiar la escarcha de cada venta a su orden de producción en esos 17 casos (solo ese campo; no se toca nada más).
2. Cuando el asesor edite un pedido mayorista, enviar también la escarcha (y doble/triple tinta) a Producción, igual que ya pasa con gel, tinta y silicona.
3. Como respaldo, en la tarjeta de Producción mostrar la escarcha de la venta si la orden de producción no la tiene.
4. Revisar en Producción que MW-PB-01483 muestre "Color de escarcha: Dorada".

## Detalles técnicos
- Corrección de datos: `update production_orders p set glitter_color = o.glitter_color from orders o where p.order_id = o.id and o.glitter_color is not null and p.glitter_color is distinct from o.glitter_color`.
- `MisPedidos.tsx` (edición mayor): incluir `glitter_color`, `ink_count`, `ink_color_2/3` en el update a `orders` y en la propagación a `production_orders`.
- `useProductionOrders.ts` / `MagicalWarmersWorkflow.tsx`: fallback a `orders.glitter_color` del pedido vinculado.
- La creación inicial (`orderFlow.ts`) ya copia la escarcha.
