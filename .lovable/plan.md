## Objetivo

Reemplazar el ajuste manual de stock por un **flujo de solicitudes** donde otras áreas piden cuerpos o producto terminado a inventarios, e inventarios **aprueba o rechaza**. Al aprobar, se descuenta automáticamente del stock. Para ingresos, inventarios puede sumar manualmente (entrada de producción/devoluciones).

---

## Flujo de salidas (descuentos)

**Quién puede solicitar:**
- Producción
- Estampación
- Logística
- Asesores comerciales (de forma automática al confirmar un pedido de venta de producto terminado)

**Qué se solicita:** una referencia de `cuerpos_referencias` o `producto_terminado` + cantidad + motivo opcional.

**Estados de la solicitud:** `pendiente` → `aprobada` (descuenta stock) | `rechazada` (con motivo).

**Quién aprueba:** rol `inventarios` (y `admin`).

### Caso especial — Asesores (ventas)
Cuando un asesor crea un pedido en Ventas que incluye producto terminado existente en stock, se genera automáticamente una solicitud de salida hacia inventarios con:
- Solicitante = nombre del asesor
- Referencia = producto del pedido
- Cantidad = cantidad del pedido
- Referencia al `order_id` para trazabilidad

Si inventarios rechaza, el pedido queda marcado y produce notificación al asesor para reabastecer vía producción.

### Caso producción / estampación / logística
Desde su propia vista (o un botón "Solicitar a inventarios" en el panel correspondiente) crean la solicitud. Se les muestra el catálogo filtrado y eligen referencia + cantidad.

---

## Flujo de entradas (ingresos)

Inventarios puede:
1. **Recibir órdenes de producción terminadas** (ya existe parcialmente con `body_production_tasks` y la pestaña "Recepción de pedidos") → al marcar como recibido, suma al stock.
2. **Sumar manualmente** desde la fila del ítem (botón **+ Ingresar**) con motivo: devolución, ajuste, ingreso externo. Esto sí queda como acción directa de inventarios.

---

## Vista de inventarios — qué cambia

En `InventariosRoleView.tsx` agregar una nueva pestaña **Solicitudes** con dos secciones:

- **Pendientes** — lista de solicitudes con: solicitante (nombre + área), referencia, cantidad, fecha, motivo. Botones **Aprobar** y **Rechazar** (rechazar pide motivo).
- **Historial** — solicitudes aprobadas/rechazadas recientes, con filtro por área y referencia.

En `CategorizedInventoryPanel.tsx` (cuando el rol es inventarios y la categoría es cuerpos o producto terminado):
- Mantener el botón de **editar** existente para correcciones.
- Agregar botón **+ Ingresar** por fila (suma directa con motivo).
- **No** agregar botón de restar — las salidas siempre pasan por solicitud.

---

## Vistas de los solicitantes

- **Producción / Estampación / Logística**: nuevo botón "Solicitar a inventarios" que abre diálogo con selector de marca + categoría (cuerpos o producto terminado) + referencia + cantidad + motivo.
- **Asesores comerciales**: la solicitud se genera **automáticamente** al confirmar un pedido cuyo producto exista en stock terminado. No requieren botón nuevo.

Todos ven el estado de sus solicitudes (pendiente / aprobada / rechazada) en una sección "Mis solicitudes".

---

## Modelo de datos (nueva tabla)

`inventory_requests`:
- `id`, `created_at`, `updated_at`
- `requester_id` (uuid), `requester_name` (text), `requester_area` (text: `produccion` | `estampacion` | `logistica` | `asesor_comercial`)
- `brand` (text), `category` (text: `cuerpos_referencias` | `producto_terminado`)
- `stock_item_id` (uuid, referencia a `stock_items`)
- `item_name` (text, snapshot)
- `quantity` (numeric)
- `reason` (text, nullable)
- `status` (text: `pendiente` | `aprobada` | `rechazada`)
- `reviewed_by` (uuid, nullable), `reviewed_by_name` (text, nullable), `reviewed_at` (timestamptz, nullable)
- `rejection_reason` (text, nullable)
- `order_id` (uuid, nullable — para solicitudes auto-generadas desde Ventas)

**RLS:**
- Inventarios y admin: gestionan todo (insert/update/select)
- Producción, estampación, logística, asesor: pueden insertar (con `requester_id = auth.uid()`) y ver las suyas
- Inventarios actualiza estado y dispara el descuento de stock al aprobar

**Lógica de aprobación:** al pasar a `aprobada`, un trigger `BEFORE UPDATE` valida stock disponible y descuenta `stock_items.available` (y `body_stock` cuando aplique para magical/cuerpos). Si no hay stock suficiente, lanza excepción y la aprobación falla con toast claro.

Opcional: tabla `stock_movements` para historial de todas las entradas/salidas (incluye ingresos manuales y aprobaciones), pero con `inventory_requests` ya queda trazabilidad de las salidas.

---

## Notificaciones

- Al crear solicitud → notificación al rol `inventarios`.
- Al aprobar/rechazar → notificación al solicitante (`target_user_id`).
- Si rechazo viene de pedido de asesor → también notificar a producción para considerar reabastecer.

---

## Preguntas antes de implementar

1. Para los pedidos de **asesores**, ¿la solicitud se genera al **crear el pedido** o solo al **confirmar/aprobar el pedido**? (Hoy los pedidos pasan por estados; quiero saber en cuál disparar la solicitud).
2. Si inventarios **rechaza** una solicitud de un asesor, ¿el pedido de venta queda **bloqueado** esperando producción, o el asesor decide qué hacer?
3. Para los **ingresos manuales** (botón + en la fila), ¿basta con cantidad + motivo libre, o quieres opciones predefinidas (devolución, ajuste, producción externa)?
