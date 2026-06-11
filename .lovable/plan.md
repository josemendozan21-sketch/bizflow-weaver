## CRM de Clientes — Plan de implementación

Construir un módulo de clientes integrado al POS, con perfil 360°, historial de compras, métricas, y campos preparados para fidelización futura (puntos, niveles, cupones, referidos).

---

### 1. Base de datos (migración)

**Tabla `customers`** (nueva)
- Identidad: `document` (cédula/NIT, único), `full_name`, `phone`, `email`, `city`, `address`, `birth_date`
- Segmentación: `sport` (running, trail, ciclismo, triatlón, gym, crossfit, senderismo, otro), `notes`, `tags` (text[])
- Estado: `status` (activo/inactivo — derivado por última compra, almacenado como caché)
- Fidelización (preparado, no activo): `points_current` (0), `points_accumulated` (0), `tier` ('Bronze'), `last_redemption_at`
- Referidos (preparado): `referred_by` (FK customers), `referral_code` (único, autogenerado)
- Métricas cacheadas (actualizadas vía trigger): `purchase_count`, `total_spent`, `avg_ticket`, `last_purchase_at`, `first_purchase_at`
- Auditoría: `created_by` (uuid), `created_at`, `updated_at`

**Tablas preparadas (vacías, listas para activarse):**
- `customer_loyalty_movements` — entradas/salidas de puntos (`type`: earn/redeem/adjust, `points`, `sale_id`, `reason`)
- `customer_coupons` — código, descuento, vigencia, usos, customer_id (nullable = público)
- `loyalty_tiers` — config de niveles (Bronze/Silver/Gold/Platinum, umbrales, multiplicador)
- `marketing_campaigns` — segmento, canal, fechas (para futuro)

**Integración con ventas existentes:**
- `pos_sales.customer_id` (FK customers, nullable) — además del `client_document` actual
- Trigger `AFTER INSERT/UPDATE/DELETE` en `pos_sales` que recalcula métricas del cliente vinculado
- Migración de datos: para `pos_sales` existentes con `client_document`, crear/vincular `customer_id` automáticamente

**RLS:**
- Lectura: admin, contabilidad, pos_punto (de cualquier ciudad — base compartida)
- Escritura: admin y pos_punto
- GRANTs explícitos a `authenticated` y `service_role`

---

### 2. Hook `useCustomers` (`src/hooks/useCustomers.ts`)

- `useCustomers(filters)` — listado con búsqueda por documento/nombre/teléfono/ciudad
- `useCustomer(id)` — perfil + métricas
- `useCustomerByDocument(doc)` — lookup instantáneo desde POS
- `useCustomerSales(customer_id)` — historial cronológico con items
- `useCreateCustomer`, `useUpdateCustomer`
- `useCustomerDashboardMetrics` — agregados (nuevos del mes, activos 30d, inactivos 90d+, top 20)

---

### 3. Integración con POS (`PuntoVentaPOS.tsx` + `PuntoVentaDetalle.tsx`)

**Nuevo componente `CustomerLookupBar`** colocado al inicio del flujo de venta:
- Input grande "Cédula / teléfono" con autocomplete (debounced)
- Si existe → tarjeta compacta: nombre, ciudad, teléfono, compras, total gastado, ticket promedio, última compra, badge de estado/nivel
- Si no existe → botón "Crear cliente nuevo" → dialog inline con campos mínimos (cédula, nombre, teléfono, ciudad, deporte) sin perder el carrito
- Botón "Cambiar / Quitar cliente" y soporte para "Consumidor Final"

**Flujo actualizado:**
1. Buscar/crear cliente
2. Agregar productos al carrito
3. Finalizar venta (la venta queda con `customer_id` además de los campos legacy de client)

---

### 4. Sección "Clientes" (nuevo módulo)

**Ruta:** `/clientes` — entrada nueva en `AppSidebar` con icono `Users` (o `Contact`), visible para admin, contabilidad, pos_punto.

**Páginas:**
- `src/pages/Clientes.tsx` — listado + filtros + crear
- `src/pages/ClienteDetalle.tsx` (o dialog/drawer) — perfil completo

**Listado (`CustomersList.tsx`):**
- Tabla: Nombre · Cédula · Teléfono · Ciudad · Compras · Total · Última compra · Registro · Estado
- Filtros: búsqueda libre (nombre/cédula/teléfono), ciudad (select), deporte, estado (activo/inactivo), ordenamiento
- Paginación / virtualización si crece
- Botón "Nuevo cliente"

**Perfil (`CustomerProfile.tsx`):**
- Header: nombre, badges (estado, nivel, deporte), acciones (editar)
- Tarjetas de métricas: compras, total gastado, ticket promedio, última compra, días desde última compra, puntos actuales (preview)
- Tabs:
  - **Información** — todos los campos + editar inline
  - **Historial de compras** — tabla cronológica con fecha, factura, productos (con cantidades), total, ubicación
  - **Fidelización** — placeholder con puntos/nivel (visible pero "próximamente")

---

### 5. Dashboard de clientes

**En `PuntoReportes.tsx`** (solo admin y contabilidad — no para `pos_punto`):
- KPIs: clientes registrados, nuevos este mes, activos 30d, inactivos 90d+, valor promedio por cliente
- Top 20 clientes por compras (tabla con link al perfil)

---

### 6. UX/UI

- Mantener el sistema visual actual (shadcn + tokens semánticos del proyecto, sin colores nuevos)
- Búsqueda instantánea con debounce 200ms y atajo de teclado (Enter para confirmar)
- Diseño responsive: la tarjeta del cliente en POS colapsa a una fila compacta en tablet
- Estados de carga y vacíos consistentes con el resto del ERP

---

### Detalles técnicos

- Los triggers recalculan métricas para evitar agregaciones costosas en cada render
- El campo `client_document` actual en `pos_sales` se conserva (compatibilidad); el nuevo `customer_id` es la fuente de verdad cuando exista
- Backfill: una sola consulta que agrupa ventas existentes por `client_document` y crea customers
- `referral_code` se genera con `substr(md5(random()::text), 1, 8)` por defecto
- Index en `customers(document)`, `customers(phone)`, `pos_sales(customer_id)`

---

### Orden de ejecución

1. Migración (tabla `customers` + tablas preparatorias + FK + trigger + backfill + RLS/GRANTs)
2. Hook `useCustomers`
3. Sección `/clientes` (listado + perfil) + entrada en sidebar
4. Integración en POS (`CustomerLookupBar` + flujo)
5. Dashboard de clientes en reportes

¿Apruebas el plan para proceder?
