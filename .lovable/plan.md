## Objetivo

Cambiar el panel de **Solicitudes de inventario** para que reciba **todos los pedidos** (mayoristas y al detal) y muestre, por cada fila, el **stock disponible** del producto + un selector de **ruteo** (Producción / Estampación / Logística) para que inventarios decida con criterio objetivo.

---

## Cambios en el flujo

1. **Ventas al detal y mayorista crean siempre la solicitud**
   - Hoy el detal ya crea `inventory_requests`. Mantener ese comportamiento.
   - Asegurar que los mayoristas también generen una solicitud al confirmar pedido (revisar si hoy se hace; si no, agregarlo) con `category = producto_terminado` y `order_id` para trazabilidad.
   - Ya **no se bloquea** la creación por falta de stock — entran todas. Inventarios decide qué hacer en función del stock visible.

2. **Panel de Solicitudes (inventarios)**
   En `InventoryRequestsPanel.tsx`, en la tabla de **Pendientes**, agregar dos columnas nuevas:
   - **Stock disponible**: lee `stock_items.available` por `stock_item_id` (fallback a `name + brand + category`). Se muestra con badge:
     - verde si `disponible >= cantidad solicitada`
     - ámbar si `0 < disponible < cantidad`
     - rojo si `disponible = 0`
   - **Ruteo**: selector con tres opciones:
     - **Entregar a Logística** (caso normal: hay stock → aprobar y descontar)
     - **Pasar a Producción** (no hay stock → genera tarea en `body_production_tasks` o `production_supply_orders` según categoría, y la solicitud queda en estado `en_produccion`)
     - **Pasar a Estampación** (hay cuerpos pero falta personalización para pedidos con logo → crea/actualiza `production_orders` ligado al `order_id`)

3. **Botón principal por fila**: "Procesar" — usa el ruteo seleccionado:
   - Logística → status `aprobada` (descuenta stock como hoy vía trigger).
   - Producción → status nuevo `en_produccion` + insert en `body_production_tasks` (cuerpos) o `production_supply_orders` (producto terminado), notificación a producción.
   - Estampación → status nuevo `en_estampacion` + insert/update en `production_orders` con `current_stage = 'estampacion'`, notificación a estampación.
   - Mantener botón **Rechazar** (con motivo) por si el pedido no procede.

4. **Sugerencia automática del ruteo**
   Al cargar la fila, preseleccionar la opción más razonable:
   - `disponible >= cantidad` → Logística
   - `cuerpos_referencias` sin stock → Producción
   - `producto_terminado` sin stock pero con `order_id` que requiere logo/estampado → Estampación
   - en otro caso → Producción

---

## Cambios técnicos

### Base de datos (migración)
- Ampliar el check/valores de `inventory_requests.status` para aceptar: `pendiente`, `aprobada`, `rechazada`, `en_produccion`, `en_estampacion`, `entregada`.
- Agregar columna `routed_to text` (nullable: `produccion` | `estampacion` | `logistica`) y `routed_at timestamptz`.
- Trigger `process_inventory_request_approval` actualizado:
  - Solo descuenta stock cuando pasa a `aprobada` (o `entregada`), igual que hoy.
  - Cuando pasa a `en_produccion` o `en_estampacion`: no descuenta, solo notifica al rol correspondiente.
- Mantener notificación al solicitante en cada cambio.

### Frontend
- `useInventoryRequests.ts`: nuevos métodos `routeToProduction(id, payload)`, `routeToStamping(id, payload)`, además de `approve` (logística).
- `InventoryRequestsPanel.tsx`:
  - Cargar `stockItems` con `useInventory()` y mapear por id/name+brand+category para mostrar stock por fila.
  - Nuevas columnas: **Stock** (badge con color) y **Ruteo** (Select).
  - Botón "Procesar" ejecuta la acción según el Select.
  - Historial conserva las nuevas columnas como informativas.
- `Ventas.tsx` (mayoristas): si hoy no se crea solicitud al confirmar pedido mayorista de producto terminado, agregar la creación análoga al detal con `requester_area = 'asesor_comercial'` y `order_id`.

### Sin cambios
- `CategorizedInventoryPanel.tsx`, `SupplyReceptionPanel.tsx` y la pestaña "Recepción de pedidos" (esa sigue siendo solo para entradas desde producción a inventario, no se mezcla con las solicitudes de salida).

---

## UX resultante

En la pestaña **Solicitudes → Pendientes** inventarios verá una tabla así:

```text
Solicitante | Producto         | Cant. | Stock | Motivo        | Ruteo            | Acciones
Asesor X    | Cervical (Frío)  |  20   |  30   | Pedido #123   | [Logística ▼]    | Procesar  Rechazar
Producción  | Antifaz (Frío)   | 100   |  12   | Reabastecer   | [Producción ▼]   | Procesar  Rechazar
Asesor Y    | Sweatshirt M     |  10   |   0   | Pedido #128   | [Estampación ▼]  | Procesar  Rechazar
```

Esto cumple lo que pediste: todos los pedidos llegan completos y al frente se decide ruteo viendo el stock real.

---

## Confirmaciones que necesito antes de implementar

1. ¿Confirmas los **tres destinos de ruteo** (Producción, Estampación, Logística) o agregamos algún otro estado (ej. "Reservado parcial")?
2. Cuando se rutea a **Producción/Estampación**, ¿la solicitud debe quedar visible en "Pendientes" hasta que esa área la complete y entonces vuelva como `entregada`, o pasa directamente a Historial al rutearse?
