## Rediseño del módulo Inventarios

Reorganizamos Inventarios alrededor de 4 pestañas claras, una sola entrada para cada acción. Todo se conecta a las notificaciones existentes y descuenta stock al confirmar.

### Nueva estructura de pantalla (rol Inventarios)

```text
Inventarios
├── 1. Bandeja de pedidos          ← qué pedidos hay (mayor + detal)
├── 2. Solicitudes internas        ← producción / estampación / asesores piden MP o cuerpos
├── 3. Movimientos / historial     ← log de todo lo que entró y salió
└── 4. Stock por marca             ← (lo de hoy) ver/editar inventario
```

### 1. Bandeja de pedidos (mayor y detal)

Una tarjeta por cada pedido nuevo con todo lo que Inventarios necesita decidir:

- **Cliente, marca, producto, cantidad, asesor, fecha entrega**.
- Badge de origen: *Mayor* / *Detal*.
- Stock disponible para esa referencia (verde / ámbar / rojo).
- Acciones según el caso:
  - **Pedido al por mayor** → botones `Entregar a Estampación` y `Entregar a Logística` (Inventarios decide; al confirmar pide cantidad y opcional observación, descuenta stock y registra movimiento al área elegida).
  - **Pedido al detal** → la solicitud llega ya creada automáticamente (ver abajo); botón único `Entregar a Logística`.
- Notificación al área que recibe: "Inventarios entregó X uds de Y para pedido de [Cliente]".

Para mayor: el pedido aparece en la bandeja apenas se crea (notificación + tarjeta), no requiere que Producción/Estampación lo pidan.

### 2. Solicitudes internas (MP / cuerpos / PT)

Formulario nuevo `Solicitar a Inventarios` (usado por Producción, Estampación, Asesores) con campos:

- Área (auto del rol, editable por admin).
- Persona que solicita (auto, editable).
- Tipo: Materia prima / Cuerpos / Producto terminado / Importado.
- Marca, Referencia (autocomplete del stock), Cantidad, Unidad.
- **Urgencia** (Normal / Alta / Urgente) con color.
- **Pedido relacionado** (opcional, búsqueda por cliente).
- **Observaciones** (¿para qué se requiere?).

En la bandeja de Inventarios cada solicitud muestra todos esos datos y dos botones: `Entregar` (descuenta y notifica al solicitante) o `Rechazar` (con motivo).

### 3. Recepción de stock unificada

Un solo botón grande **`+ Registrar entrada`** que abre un diálogo con:

- Selector de tipo: *Producto terminado · Cuerpos · Materia prima · Importado*.
- Marca, referencia (autocomplete o crear nueva), cantidad, unidad.
- Proveedor / origen (texto libre), fecha, observaciones, soporte (foto/factura opcional).
- Al confirmar suma stock y queda en historial como movimiento tipo *Entrada* con su tipo.

Reemplaza los dos paneles actuales (`SupplyReceptionPanel` + diálogos sueltos) por este único punto.

### 4. Pedidos al detal → auto-solicitud

Cuando se crea una venta al detal (en `Ventas.tsx`), un trigger inserta automáticamente una `inventory_request` con:

- `requester_area = 'asesor_comercial'`, `category = 'producto_terminado'`.
- Reason: `Pedido al detal de [Cliente] — pedido #[id]`.
- `routed_to = 'logistica'` sugerido.

Inventarios la ve en la Bandeja de pedidos (sección Detal) con un único botón `Entregar a Logística`.

### 5. Notificaciones (sin tocar funciones existentes)

Reusamos `notifications` y los triggers ya existentes. Solo añadimos:

- Notificación a Inventarios cuando entra un pedido al por mayor nuevo.
- Mensaje de entrega indica el área receptora y el pedido/cliente.

---

### Detalle técnico

**DB (migraciones):**

- Añadir a `inventory_requests`: `urgency text default 'normal'`, `requester_person text`, `item_type text` (mp/cuerpos/pt/importado).
- Añadir a `inventory_movements`: `entry_type text` (entrada/entrega/retorno) y `supplier text`, `proof_url text` para entradas.
- Trigger `notify_inventarios_new_mayor_order` en `orders` (AFTER INSERT donde `sale_type='mayor'`): crea notificación a rol `inventarios`.
- Trigger `auto_create_retail_inventory_request` en `orders` (AFTER INSERT donde `sale_type='detal'` con producto identificable): inserta fila en `inventory_requests` con la marca/ítem/cantidad y `routed_to='logistica'`.
- Mantener `process_inventory_request_approval` y `process_inventory_movement` actuales.

**Frontend (archivos a crear/editar):**

- `src/components/inventory/v2/InventoryDashboard.tsx` (nuevo, contenedor de 4 tabs).
- `src/components/inventory/v2/OrdersInbox.tsx` (nuevo): muestra pedidos mayor + detal con acciones.
- `src/components/inventory/v2/InternalRequestsPanel.tsx` (refactor de `InventoryRequestsPanel`): tabla con todos los campos nuevos.
- `src/components/inventory/v2/CreateRequestDialog.tsx` (refactor de `CreateInventoryRequestDialog`): añade urgencia/persona/pedido relacionado/tipo.
- `src/components/inventory/v2/RegisterEntryDialog.tsx` (nuevo, unifica entradas).
- `src/components/inventory/v2/MovementsHistory.tsx` (refactor de `InventoryMovementsPanel`): añade columna tipo (entrada/entrega/retorno).
- `src/pages/Inventarios.tsx`: usa `InventoryDashboard` para rol `inventarios`.
- `src/hooks/useInventoryRequests.ts`: extender tipos e input de `createRequest`.

**Sin cambios en:** flujos de Producción/Estampación (`SweatspotWorkflow`, `EstampacionProductionView`) salvo que ahora el diálogo "Solicitar a inventarios" muestra los nuevos campos.

---

### Plan por fases (para reajustar paso a paso como pediste)

1. **Fase 1 — DB y notificaciones:** migraciones + trigger de auto-solicitud al detal + notificación a inventarios al crear pedido al por mayor.
2. **Fase 2 — Bandeja de pedidos:** nueva tab unificada con acciones Entregar a Estampación / Logística.
3. **Fase 3 — Solicitudes internas mejoradas:** nuevo formulario y tabla con urgencia/persona/observaciones/pedido relacionado.
4. **Fase 4 — Registro de entradas unificado:** reemplazar `SupplyReceptionPanel` por el diálogo único.
5. **Fase 5 — Historial de movimientos enriquecido:** columna tipo y filtros entrada/entrega/retorno.

Después de cada fase paramos y la pruebas antes de seguir.

¿Arrancamos por la Fase 1 (base de datos + notificaciones automáticas)?
