# Entregas parciales también en Sweatspot

Las entregas por partes hoy funcionan igual para las dos marcas en el registro (la base de datos no distingue marca), pero **en pantalla no se ven en varios sitios de Sweatspot**, y en la bandeja de Inventarios el camino de Sweatspot al por mayor (salida de kit a Estampación) no deja registrar una entrega por partes. Por eso parece exclusivo de Magical: hoy no hay ni una sola entrega parcial registrada en un pedido Sweatspot.

## Qué se va a hacer

**1. Bandeja de Inventarios**
- El avance "X / Y entregadas" y el botón de entrega parcial aparecerán en todas las tarjetas, también en las de Sweatspot al por mayor (kit y termos sin logo) y al detal.
- En la ventana de entrega se podrá indicar una cantidad menor a la del pedido; lo entregado se descuenta del pendiente y el pedido sigue abierto hasta completarse.

**2. Logística**
- Los pedidos Sweatspot con entregas incompletas aparecerán en la pestaña "Entregas parciales" y podrán despacharse por partes igual que los de Magical, con la etiqueta de avance visible en cada línea.

**3. Tablero de Producción Sweatspot**
- Cada tarjeta de termos mostrará el avance de entregas y, para los roles que pueden registrarlas (Producción, Inventarios, Logística, Admin), el botón de entrega parcial. Se agrega lo mismo en el tablero de Magical Warmers, que hoy tampoco lo muestra.

**4. Mis pedidos (asesor)**
- El asesor verá el avance de entregas en los pedidos Sweatspot igual que en los de Magical, incluidos los pedidos de varias líneas.

También se revisa que los cierres automáticos (cuando lo entregado alcanza el total, el pedido pasa a despachado) funcionen igual en Sweatspot.

## Detalle técnico

- `src/components/inventory/WholesaleOrdersInbox.tsx`: `PartialDeliveryControl` en todas las tarjetas (mayor y detal, sin condición de marca); en `confirmDeliver`, cuando la cantidad indicada es menor que `order.quantity`, registrar además la fila en `order_deliveries` en vez de cerrar el pedido; en el camino "kit Sweatspot" habilitar el campo de unidades del pedido (separado de las cantidades del kit) para registrar la entrega parcial.
- `src/pages/Logistica.tsx`: verificar que `partialOrders` y el despacho por grupo no dependan de `production_status` de Magical; los pedidos Sweatspot que salen por kit deben entrar a la pestaña de parciales por `delivered_quantity`.
- `src/components/production/SweatspotWorkflow.tsx` y `MagicalWarmersWorkflow.tsx`: consultar `orders (id, quantity, delivered_quantity)` por `order_id` de la orden de producción y renderizar `PartialDeliveryControl` en la tarjeta.
- `src/components/ventas/MisPedidos.tsx`: `DeliveryProgressBadge` ya está por línea; ajustar para que también aparezca cuando el grupo tiene más de 4 líneas y en la vista de detalle del pedido.
- Sin cambios de esquema, permisos ni de los triggers `validate_order_delivery` / `recalc_order_delivered` (ya son iguales para ambas marcas).
