# Reserva automática de inventario al crear un pedido

Hoy, cuando un asesor crea un pedido, el sistema calcula cuánto hay disponible y crea el "requerimiento", pero **no descuenta nada**: el stock sigue apareciendo completo para los demás asesores hasta que Inventarios confirma. Eso es lo que produce la sobreventa.

La base para reservar ya existe en el sistema (estado "en proceso" por referencia, movimientos de tipo reserva/liberación y un panel de reservas), pero está apagada. El plan la reactiva y la vuelve automática.

## Decisiones aplicadas

- Alcance: todos los pedidos, mayor y detal, ambas marcas.
- Liberación automática: solo al cancelar el pedido. No hay vencimiento por tiempo.
- Liberación manual: Administrador e Inventarios.

## Cómo va a funcionar

1. **Al crear el pedido**: el sistema busca la referencia en inventario y reserva de inmediato lo que alcance (si el pedido pide 800 y hay 1.000, reserva 800; si hay 500, reserva 500 y los 300 restantes quedan como faltante para producción, como hoy).
2. **Disponible en tiempo real**: esas unidades salen del disponible al instante. Cualquier otro asesor que consulte verá solo lo realmente vendible.
3. **Tres cifras por referencia**: Físico = Disponible + Reservado. Se muestran separadas en Inventarios y en la vista del asesor.
4. **Cuando Inventarios entrega el pedido**: la reserva se consume (no se vuelve a descontar del disponible), evitando el doble descuento actual.
5. **Si el pedido se cancela**: la reserva se libera automáticamente y el stock vuelve al disponible.
6. **Liberación manual**: Admin e Inventarios pueden liberar una reserva desde el panel de reservas, con motivo obligatorio y registro en el historial.

## Vistas

- **Inventarios**: se reactiva el panel "Reservas" con las reservas activas agrupadas por pedido (cliente, asesor, referencia, unidades, fecha, estado) y botón de liberar. El resumen del área muestra Disponible / Reservado / Pendientes por preparar.
- **Asesor**: los selectores y tarjetas de stock muestran el disponible ya descontado, con la nota "reservado: N" cuando aplique, para que se entienda por qué bajó.
- **Historial**: cada reserva, consumo y liberación queda en el historial de movimientos y en la auditoría de inventario, con usuario, pedido y fecha.

## Detalles técnicos

Base de datos (una migración):
- Nueva tabla `order_reservations` (order_id, order_code, stock_item_id, item_name, brand, quantity, status `activa|consumida|liberada`, released_by/at, release_reason, timestamps) con GRANTs y RLS: lectura para roles internos, escritura solo vía funciones.
- Extender el trigger `create_order_requirement` para que, además del requerimiento, inserte el movimiento `reserva` por la cantidad cubierta y cree la fila en `order_reservations`. La lógica de descuento ya vive en `process_inventory_movement` (`available -` / `in_process +`).
- Ajustar `confirm_order_requirement` para que consuma la reserva (baja `in_process`) en lugar de volver a descontar `available`; si no hay reserva previa, mantiene el comportamiento actual.
- Nuevo trigger de cancelación en `orders` que, al pasar a estado cancelado, libere las reservas activas del pedido (movimiento `liberar_reserva`).
- Nueva función `release_order_reservation(_reservation_id uuid, _reason text)` SECURITY DEFINER, restringida a `admin` e `inventarios`, que libera y registra motivo + notificación al asesor.

Frontend:
- `RESERVATIONS_ENABLED = true` en `src/lib/featureFlags.ts` (reactiva panel, filtros y tipos de movimiento ya construidos).
- `ReservationsPanel.tsx`: reescribir su origen de datos a `order_reservations` y usar la nueva función para liberar; montarlo como pestaña en la vista de Inventarios.
- `InventoryDashboardSummary.tsx`: tarjetas Disponible / Reservado / Pendientes por preparar sobre las nuevas cifras.
- `referenceCatalog.ts` y los selectores de referencia en Ventas: mostrar disponible real y la etiqueta "reservado".

No se modifican los cálculos de comisiones, pagos ni el flujo de producción.

## Verificación

- Prueba en base de datos: pedido de 800 sobre 1.000 → disponible 200, reservado 800; confirmación de Inventarios → disponible 200, reservado 0, sin doble descuento; cancelación → vuelve a 1.000.
- Revisión visual de la vista de Inventarios y del selector de referencias del asesor.
