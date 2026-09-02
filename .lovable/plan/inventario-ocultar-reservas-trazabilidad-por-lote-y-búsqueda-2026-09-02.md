# Inventario: ocultar reservas, trazabilidad por lote y búsqueda unificada

## 1. Deshabilitar reservas (solo frontend)

Las reservas hoy aparecen como pestaña "Reservas" en Inventarios (vista admin y vista del rol inventarios) y como tipo de movimiento en el historial.

- Ocultar la pestaña "Reservas" y su contenido en ambas vistas de Inventarios. El componente `ReservationsPanel` se conserva en el código, solo deja de montarse.
- Quitar las opciones "Reservas" y "Liberaciones" del filtro de tipo en el Historial de movimientos, y ocultar la opción de reservar en los formularios de movimiento.
- No se toca nada en la base de datos: la tabla, los triggers y los 24 movimientos de reserva ya existentes se quedan igual. Los registros históricos de tipo reserva siguen visibles en el historial (con su etiqueta), simplemente ya no se pueden crear nuevos.
- Se centraliza en una bandera única (`RESERVATIONS_ENABLED = false`) para poder reactivarlo cambiando un valor.

## 2. Trazabilidad de inventario (¿qué pasó con esas 1.000 gafas?)

Nueva pestaña **Trazabilidad** dentro de Inventarios (admin e inventarios).

Cómo funciona:

- Se elige un ítem/referencia (buscador) y un rango de fechas (desde / hasta), por defecto los últimos 3 meses.
- Arriba, tarjetas resumen del rango: unidades que entraron, unidades que salieron, y saldo actual del ítem.
- Debajo, el desglose de destinos de esas salidas, agrupado:
  - Pedidos: número de pedido (ej. `MW-PB-01154`), cliente, asesor y unidades.
  - Ferias: nombre de la feria y unidades.
  - Producción / Estampación / Logística: unidades por área.
  - Otros / sin destino registrado.
- Y una línea de tiempo detallada, movimiento por movimiento, con fecha, tipo, cantidad, destino y quién lo registró, con saldo acumulado para ver la evolución.
- Todo exportable a Excel para contabilidad.

Ejemplo de lectura: "Gafas Fancy — entraron 1.000 el 10/01/2025; 500 salieron al pedido MW-PB-00842, 50 a la Feria Medellín, 350 a producción, quedan 100."

Para que el desglose sea preciso hacia adelante:

- En el formulario de registrar salida se añade un campo de destino opcional pero guiado: pedido (buscando por número o cliente) o feria, según el área elegida. Hoy 443 de 1.378 movimientos ya tienen pedido asociado y ninguno tiene feria; los que no lo tengan aparecerán agrupados como "sin destino registrado" en vez de perderse.
- Las salidas que ya genera el sistema automáticamente (despachos a pedidos, envíos a feria) seguirán guardando su referencia como hasta ahora.

## 3. Búsqueda unificada y más robusta

Se crea un único ayudante de búsqueda que se usa en todos los buscadores relevantes:

- Ignora mayúsculas/minúsculas, tildes y diéresis (`Angela` = `Ángela`, `frio` = `frío`).
- Ignora guiones y espacios en los números de pedido: `sw vm 1155`, `SWVM01155`, `1155` y `sw-vm-01155` encuentran el mismo pedido.
- Busca por varias palabras en cualquier orden ("angela muelita" encuentra el pedido de Ángela con muelitas).
- Campos cubiertos: número de pedido, cliente, asesor, marca, referencia/producto, motivo y proveedor.

Se aplica en: Mis Pedidos (ventas), bandeja de pedidos de Inventarios, Historial de movimientos, catálogos de inventario (materia prima, Magical, Sweatspot, punto 92, ferias), vistas de producción y estampación, y la nueva pestaña de Trazabilidad.

## Detalles técnicos

- Nuevo `src/lib/search.ts`: `normalizeText`, `normalizeCode`, `matchesQuery(fields, query)`; reemplaza los `toLowerCase().includes()` dispersos y el `normalizeCode` local ya añadido en `MisPedidos.tsx` y `WholesaleOrdersInbox.tsx`.
- Nuevo `src/components/inventory/InventoryTraceabilityPanel.tsx` + hook `useInventoryTrace(itemId, from, to)` que consulta `inventory_movements` filtrando por `stock_item_id` y `recorded_at`, con join a `orders` (`order_code`, `client_name`, `advisor_name`) y `ferias` (`name`).
- `useInventoryMovements` hoy limita a 200 registros; la trazabilidad usará su propia consulta paginada por rango de fechas para no truncar el histórico.
- Bandera `RESERVATIONS_ENABLED` en `src/lib/featureFlags.ts`, consumida por `Inventarios.tsx`, `InventariosRoleView.tsx`, `MovementHistoryTable.tsx` y `RegisterMovementDialog.tsx`.
- `RegisterMovementDialog`: selector de pedido/feria que llena `order_id` / `feria_id`.
- Sin cambios de esquema en base de datos; se añadirán solo índices si la consulta por rango lo requiere.
