

## Plan: Sincronizar inventario de producción con base de datos y agregar notificaciones con colores

### Problema identificado
El módulo de inventarios para producción usa un **store local (Zustand)** con datos hardcodeados que nunca se sincronizan con la base de datos. Cuando ventas descuenta stock, lo hace en la base de datos (Supabase), pero producción sigue viendo los valores iniciales del Zustand store. Son dos fuentes de datos completamente desconectadas.

### Solución

#### 1. Migrar CategorizedInventoryPanel a usar datos de Supabase
- Reemplazar el uso de `useInventoryStore` (Zustand) por `useInventory` (hook de Supabase) en `CategorizedInventoryPanel.tsx`
- Adaptar el mapeo de datos: `stock_items` de Supabase tiene campos como `product_type`, `color`, `min_stock` que corresponden a los campos del Zustand store
- Mantener las funciones de edición (agregar, editar, eliminar) pero operando contra Supabase en vez del store local
- Esto garantiza que producción y ventas vean el mismo inventario en tiempo real

#### 2. Migrar BrandSelectionCards a usar datos de Supabase
- Reemplazar `useInventoryStore` por `useInventory` para que las notificaciones de la pantalla de selección de marca también reflejen los datos reales de la base de datos

#### 3. Agregar notificaciones con colores al módulo de producción
- Modificar `NotificationBell.tsx` para aplicar **colores por tipo de notificación**:
  - 🔴 Rojo: `bajo_inventario` — stock crítico, requiere acción urgente
  - 🟡 Amarillo: `nuevo_pedido` — pedido nuevo que requiere atención
  - 🟢 Verde: `confirmacion` — confirmaciones y completados
  - 🔵 Azul: `diseno_logo` — solicitudes de diseño
- Aplicar estilos de fondo/borde con colores en cada notificación según su `type`

### Detalle técnico

**Archivos a modificar:**
- `src/components/inventory/CategorizedInventoryPanel.tsx` — cambiar de Zustand a `useInventory` hook
- `src/components/inventory/BrandSelectionCards.tsx` — cambiar de Zustand a `useInventory` hook  
- `src/components/NotificationBell.tsx` — agregar colores por tipo de notificación
- `src/hooks/useInventory.ts` — agregar funciones de update/delete/add que necesita el panel categorizado

**Sin cambios en la base de datos** — las tablas `stock_items` y `body_stock` ya existen con la estructura necesaria.

