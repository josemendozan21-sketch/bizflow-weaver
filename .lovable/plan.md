# Número de pedido visible en todas las tarjetas

Objetivo: que el consecutivo (`MW-AM-01154`, `SW-VM-00987`, …) se vea de forma consistente en la cabecera de toda tarjeta o fila que represente un pedido, en cualquier fase y para cualquier rol.

## Estado actual (verificado)

- El código ya existe en la base: `orders.order_code` y `production_orders.order_code`.
- Ya se muestra en: bandeja de Inventarios, vista de Estampación, diálogo de detalles y diálogo de confirmación de pago de Mis Pedidos.
- No se muestra en la cabecera de las tarjetas de Mis Pedidos (es lo que se ve en la captura), ni en Logística, Contabilidad, los flujos de Producción (Magical/Sweatspot, tareas de cuerpos, llenado y estampado), Aprobaciones de estampado, panel de comisiones ni en los paneles del inicio del admin.
- Diseño de logos (`logo_requests`) no tiene ningún vínculo con el pedido en la base, así que ahí el código no puede mostrarse todavía.

## Qué se va a hacer

### 1. Componente único de badge de pedido
Crear un `OrderCodeBadge` reutilizable: muestra el código en fuente monoespaciada, con copiar al portapapeles al hacer clic, y sufijo `línea 2/3` cuando el pedido viene dividido en varias líneas. Si un pedido histórico no tiene código, muestra `—` en gris.

### 2. Colocarlo en la cabecera de cada tarjeta / fila
Mismo lugar en todas partes: arriba del nombre del cliente (o a su lado, según el ancho), antes del estado.

- **Ventas / asesor**: tarjetas de Mis Pedidos (incluidas las agrupadas: se listan los códigos de cada línea), panel de soportes pendientes, tabla de Mis Comisiones y su exportación a Excel.
- **Inventarios**: bandeja de pedidos (ya lo tiene, se homologa el estilo) y trazabilidad.
- **Producción**: flujo Magical Warmers, flujo Sweatspot, tarjetas de llenado, tarjetas de estampado, tareas de cuerpos agrupadas y panel de requerimientos.
- **Estampación**: ya lo tiene, se homologa.
- **Logística**: tarjetas de despacho y entrega, y el detalle del pedido.
- **Contabilidad**: pedidos a crédito, tarjeta de detalle de pedido, panel de ventas por asesor y comisiones.
- **Inicio (admin)**: paneles de foco y ventas del día.
- **Aprobaciones de estampado del asesor**.

### 3. Traer el código donde falte en las consultas
Varias vistas hoy no piden la columna. Se agrega `order_code` (y `line_index`/`line_count` donde aplique) a las consultas de Logística, Contabilidad, Aprobaciones de estampado, Reservas y los paneles del inicio; en Producción se usa el `order_code` que ya vive en `production_orders`.

### 4. Búsqueda por código en todas esas vistas
Donde haya buscador (Logística, Contabilidad, Producción, Aprobaciones) se pasa al buscador unificado ya creado, para poder escribir `mw-am-01154`, `MWAM01154` o solo `01154` y encontrar el pedido.

### 5. Impresiones y exportaciones
Se agrega el código a la orden de estampado imprimible, a los remisionados/etiquetas de logística y a los Excel de comisiones y de ventas, para que el mismo identificador viaje fuera del sistema.

## Nota sobre Diseño de logos

Las solicitudes de diseño no guardan a qué pedido pertenecen. Propuesta incluida en este plan: agregar una columna de referencia al pedido en `logo_requests`, llenarla cuando la solicitud nace desde un pedido, y mostrar el código en esas tarjetas. Los históricos quedarán sin código (no hay dato para inferirlo con seguridad).

## Detalle técnico

- Nuevo `src/components/common/OrderCodeBadge.tsx`; sin cambios de lógica de negocio, solo presentación y `select` de columnas.
- Migración mínima: `logo_requests.order_id uuid references public.orders(id)` (nullable) más índice; sin cambios de RLS.
- Verificación con TypeScript y revisión en el navegador de una tarjeta por área.
