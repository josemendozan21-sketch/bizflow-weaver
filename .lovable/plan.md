# Bodega como única fuente de verdad del inventario

## Qué hay hoy (verificado en la base)

- `stock_items` es el maestro de Bodega: tiene `available` e `in_process`, pero no tiene una clave de referencia guardada. Existen las funciones `build_ref_key` y `canonical_reference_name`, hoy solo se calculan al vuelo.
- `inventory_movements` con el trigger `process_inventory_movement` ya suma/resta en `stock_items` (entradas, salidas, retornos) y busca el ítem por nombre+marca+categoría cuando no viene el id.
- `feria_inventory` empareja por `product_name` (texto libre): no tiene columna que apunte al ítem de Bodega.
- `pos_products` (Punto 92) tiene `available` propio y **no** tiene relación con Bodega. `pos_central_transfers` ya trae `stock_item_id`, `pos_product_id` y estados de despacho/recepción; `pos_inventory_movements` registra entradas/salidas del punto.
- `order_reservations` reserva contra `stock_item_id` para pedidos.
- Realtime activo hoy en: `stock_items`, `body_stock`, `inventory_requests`, `production_orders`, `orders`, `notifications`, `body_production_tasks`.

## Garantía sobre el Punto 92

No se modifica ninguna cantidad, precio, foto ni línea existente de `pos_products`. Solo se agregan dos columnas nuevas (`stock_item_id` vacío y `origin`), y todas las líneas actuales quedan marcadas como `tienda`. No se borra nada ni se pone nada en cero en ninguna tabla.

## Cambios

### 1. Clave de referencia estable
- Nueva columna `ref_key` en `stock_items`, calculada automáticamente (marca + nombre limpio + tipo + color + marcado) con la función que ya existe, mantenida por trigger y con índice único.
- `feria_inventory` suma `stock_item_id` y se rellena emparejando por esa clave (el flujo de asignar/devolver ferias no cambia).

### 2. Punto 92: origen de cada línea
- `pos_products` suma `stock_item_id` (opcional) y `origin` (`bodega` | `tienda`), por defecto `tienda`.
- La tienda puede seguir creando referencias propias: esas quedan `tienda` y nunca se sincronizan con Bodega.
- La entrada por compra externa queda permitida solo en líneas `tienda`; en líneas `bodega` la única entrada es por asignación.

### 3. Asignación Bodega → 92
- Se reutiliza `pos_central_transfers`. Al recibir el traslado, una sola operación atómica: descuenta `stock_items.available`, suma a la línea de `pos_products` (creándola con `origin='bodega'` y su `stock_item_id` si no existe), y registra el movimiento en `pos_inventory_movements` y en `inventory_movements`.
- Si no hay suficiente en Bodega, la operación se rechaza completa.

### 4. Ventas al lugar correcto
- Venta del punto: descuenta solo `pos_products`.
- Venta de asesor/parrillero y ferias: descuentan solo Bodega.
- Cada movimiento queda con su origen anotado para trazabilidad.

### 5. Servicio para la tienda web SweatSpot
Nueva función con el mismo esquema de token compartido que `receive-sweatspot-order`:
- consultar disponibilidad de una o varias referencias por clave estable;
- reservar (available → in_process) de forma atómica, devuelve id de reserva y rechaza si no alcanza;
- confirmar reserva (consume el in_process) al aprobarse el pago;
- liberar reserva (in_process → available) si falla, se cancela o expira;
- expiración automática a los 30 minutos.
Todas idempotentes por un identificador externo: un reintento nunca descuenta dos veces. Se apoya en una tabla nueva de reservas web con su clave externa única.

### 6. Vista de control
Vista por referencia con: disponible en Bodega, en proceso, asignado a la 92, asignado a ferias y total controlado.

### 7. Realtime
Se activa en `pos_products`, `pos_central_transfers`, `pos_inventory_movements`, `inventory_movements` y `feria_inventory` (ya está en `stock_items`), para que el panel y la web se actualicen al instante.

## Detalles técnicos

- Migraciones: `stock_items.ref_key` (generada por trigger + índice único), `pos_products.stock_item_id/origin`, `feria_inventory.stock_item_id`, tabla `web_stock_reservations` (ref_key, cantidad, estado, `external_id` único, `expires_at`), RPCs `receive_pos_transfer`, `web_reserve_stock`, `web_confirm_reservation`, `web_release_reservation`, `expire_web_reservations`, y vista `inventory_control_view`. Todas las tablas nuevas con GRANTs y RLS.
- Edge function `sweatspot-inventory` con `SWEATSPOT_WEBHOOK_TOKEN`, operaciones `availability|reserve|confirm|release`, service role, validando el token igual que hoy.
- Sin cambios en `process_inventory_movement` salvo preferir `stock_item_id`/`ref_key` antes que el nombre; los triggers de reserva de pedidos quedan como están.
- Cron opcional para expirar reservas; si no, se expiran al consultar.

## Fuera de alcance

No se corrigen cantidades de Bodega: eso queda para el conteo físico posterior.
