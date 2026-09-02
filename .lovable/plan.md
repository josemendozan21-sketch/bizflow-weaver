# Reservas ocultas + Historial de cambios de inventario

## 1. Reservas

En el código actual la pestaña "Reservas" ya está detrás de una bandera apagada (`RESERVATIONS_ENABLED = false`) tanto en la vista de Administrador como en la de Inventarios. La captura enviada muestra una versión sin la pestaña "Trazabilidad", que sí existe en el código actual: corresponde a una versión anterior (app publicada o pestaña en caché), no al estado real del proyecto.

Acciones:
- Eliminar por completo el montaje de la pestaña y del panel de Reservas en las dos vistas (Administrador e Inventarios), en vez de dejarlo condicionado a una bandera, para que no pueda volver a aparecer por error. El componente y toda la lógica de backend (tabla, triggers, movimientos históricos) se conservan intactos.
- Publicar de nuevo la app para que la versión en línea deje de mostrar Reservas.

## 2. Historial de cambios de inventario (inmutable)

Hoy existe "Historial de movimientos" (entradas/salidas), pero no queda registro de las ediciones directas sobre los productos: cambios de cantidad disponible, creación de referencias, renombrados o eliminaciones.

Nueva bitácora de auditoría:
- Registra por cada cambio: usuario (correo y nombre), acción (creación / edición / eliminación), producto (nombre, marca, categoría, tipo), campo modificado, valor anterior, valor nuevo, y fecha y hora exactas.
- Se llena automáticamente desde la base de datos, así que registra cualquier cambio venga de donde venga, y funciona igual si mañana hay varios usuarios de inventario.
- Es inmutable: nadie (ni el administrador) puede editarla ni borrarla; solo se puede consultar.

Nueva pestaña "Historial de cambios", visible para Administrador y para Inventarios, con:
- Tabla cronológica (más reciente primero) con usuario, fecha/hora, acción, producto, campo, valor anterior → valor nuevo.
- Filtros por rango de fechas, usuario, marca, categoría, tipo de acción y búsqueda por nombre de producto.
- Descarga a Excel del historial filtrado.
- Aviso visible de que el registro es de solo lectura.

## Detalles técnicos

- Migración: tabla `public.inventory_audit_log` (`id`, `table_name`, `record_id`, `action`, `item_name`, `brand`, `category`, `product_type`, `field`, `old_value`, `new_value`, `changed_by`, `changed_by_email`, `changed_at`), índices por `changed_at`, `record_id` y `changed_by`.
- GRANT: `SELECT` a `authenticated`, `ALL` a `service_role`; sin `INSERT/UPDATE/DELETE` para usuarios. RLS activo con una única política de lectura para roles `admin` e `inventarios` (vía `has_role`). La escritura solo ocurre desde el trigger `SECURITY DEFINER`, con `EXECUTE` revocado a `public`/`anon`/`authenticated`.
- Trigger `AFTER INSERT/UPDATE/DELETE` sobre `public.stock_items` y `public.body_stock`: en UPDATE genera una fila por campo relevante que cambie (`available`, `in_process`, `name`, `brand`, `category`, `product_type`, `min_stock`, `unit`, `color`); en INSERT/DELETE una fila resumen. Usuario tomado de `auth.uid()` y correo desde `profiles`.
- Frontend: hook `useInventoryAuditLog.ts` y componente `InventoryChangeLogPanel.tsx`; se monta como pestaña "Historial de cambios" en `src/pages/Inventarios.tsx` (admin) y `src/components/inventory/InventariosRoleView.tsx`. Exportación con la utilidad de Excel ya usada en el proyecto.
- Sin cambios en la lógica de inventario existente: la auditoría solo observa.
