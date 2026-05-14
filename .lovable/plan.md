## Sweatspot 92 — Punto de Venta independiente

Crearemos un nuevo módulo "Puntos de Venta" totalmente separado de la operación de casa matriz y del módulo de Ferias. Sweatspot 92 será el primer punto, pero la estructura queda lista para agregar más en el futuro.

### Qué verá cada rol

- **Asesor del punto (rol nuevo `pos_punto`)**: solo ve su punto asignado. Puede vender, registrar entradas de inventario (compras a proveedores externos o despachos recibidos desde casa matriz), ver su stock y sus ventas/cierre del día.
- **Admin**: ve y gestiona todos los puntos, asigna asesor, configura productos.
- **Contabilidad**: ve ventas, inventario, costos y utilidad del punto en modo lectura. No edita.
- **Otros roles (producción, estampación, diseño, asesores de mayor/detal de casa matriz)**: no ven el módulo. La operación queda completamente aislada.

### Estructura del módulo

```text
Puntos de Venta
├── Sweatspot 92
│   ├── Vender (POS rápido + venta detallada)
│   ├── Inventario (productos del punto, propios y externos)
│   ├── Entradas (recibir de proveedor externo o despacho de casa matriz)
│   ├── Ventas del día / cierre
│   └── Reportes (utilidad, top productos) — visible para admin/contabilidad
```

### Inventario mixto

Cada producto del punto tiene su propio stock independiente del inventario central. Hay dos formas de aumentar stock:

1. **Compra a proveedor externo**: el asesor registra entrada con proveedor, cantidad, costo unitario y precio de venta sugerido.
2. **Despacho desde casa matriz**: admin (o inventarios) crea un traslado al punto. Al recibirlo, el asesor confirma y se descuenta del inventario central + se suma al punto, manteniendo el costo original.

Cada venta descuenta el stock del punto y registra la utilidad (precio venta − costo promedio).

### Productos y costo

- Tabla de productos del punto con: nombre, marca, proveedor (opcional), categoría, precio de venta, costo unitario actual (promedio ponderado), stock disponible.
- Las marcas externas se manejan como texto libre — no requiere crearlas en la lista oficial de marcas de la casa.

### Cambios técnicos

- **Nuevo rol** `pos_punto` en el enum `app_role`.
- **Nuevas tablas**:
  - `pos_locations` (puntos de venta: nombre, ciudad, dirección, status, asesor asignado).
  - `pos_location_assignments` (relación user ↔ punto, similar a `feria_pos_assignments`).
  - `pos_products` (catálogo del punto: nombre, marca, proveedor, categoría, precio_venta, costo_promedio, stock).
  - `pos_inventory_movements` (entradas por compra externa o por traslado desde casa matriz, salidas por venta o ajuste).
  - `pos_sales` y `pos_sale_items` (ventas con varios productos por ticket, método de pago, total).
  - `pos_central_transfers` (traslados desde inventario central → punto, con estado pendiente/recibido).
- **RLS**:
  - Asesor del punto: SELECT/INSERT/UPDATE solo donde esté asignado vía `pos_location_assignments`.
  - Admin: full access.
  - Contabilidad: SELECT en todas las tablas del módulo, sin INSERT/UPDATE/DELETE.
  - Function `is_pos_for_location(_loc uuid)` análoga a `is_pos_for_feria`.
- **Seed**: insertar el punto "Sweatspot 92" en Bogotá.
- **UI**:
  - Nueva página `/puntos-venta` con selector de punto (admin/contabilidad) o forzado al asignado (asesor del punto).
  - Componentes: `PuntoPOSGrid`, `PuntoEntradaForm`, `PuntoInventario`, `PuntoVentas`, `PuntoReportes`.
  - Item de menú visible solo para `admin`, `contabilidad` y `pos_punto`.
- **Permisos en `rolePermissions.ts`**: agregar `pos_punto` con acceso únicamente a `/puntos-venta`. Excluir el módulo del menú de los demás roles.
- **Admin Usuarios**: opción para asignar un usuario como asesor de un punto (similar a feria_pos).

### Lo que NO se mezcla con casa matriz

- No genera órdenes de producción.
- No aparece en bandeja de pedidos al por mayor / detal.
- No genera solicitudes de logo ni de inventario central.
- No aparece en comisiones de los asesores de casa matriz.
- Sus ventas no entran a los reportes globales de ventas de casa matriz (van a un reporte propio que contabilidad consolidará si lo desea).

### Resultado

Sweatspot 92 queda como una tienda independiente dentro de la plataforma, con su propio asesor, su propio inventario (productos propios + marcas externas), su propio flujo de caja, y contabilidad con visibilidad total en modo lectura. Si más adelante abres otro punto, solo agregas un registro en `pos_locations` y asignas un asesor.
