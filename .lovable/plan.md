

## Plan: Conectar Ventas, Inventarios y Producción con persistencia en base de datos

### Problema actual
Los pedidos se guardan en la tabla `orders` de la base de datos, pero las órdenes de producción se almacenan **solo en memoria** (Zustand stores). Esto significa que:
- Al recargar la página, las órdenes de producción desaparecen
- Otros usuarios no ven las órdenes creadas por Ventas
- No hay conexión real entre el pedido persistido y su flujo de producción

### Solución

#### 1. Crear tabla `production_orders` en la base de datos
Almacenará cada orden de producción con su etapa actual, estado, marca, tipo de flujo y datos técnicos. Campos clave:
- `order_id` (referencia al pedido original en `orders`)
- `brand` (magical / sweatspot)
- `current_stage`, `stage_status`, `workflow_type`, `stages` (array)
- Campos técnicos: `gel_color`, `ink_color`, `logo_file`, `thermo_size`, `silicone_color`, `needs_cuerpos`, `has_stock`, `logo_type`
- RLS: visible para producción, estampación, admin; actualizable por producción y admin

#### 2. Crear tabla `body_production_tasks`
Para tareas manuales de producción de cuerpos (Magical Warmers):
- `tipo_plastico`, `referencia`, `unidades`, `status`
- RLS similar a `production_orders`

#### 3. Modificar los formularios de Ventas (`Ventas.tsx`)
Al crear un pedido al por mayor:
- Insertar el pedido en `orders` (ya existe)
- Insertar una orden de producción en `production_orders` con la etapa inicial correcta
- Para Magical: evaluar stock de cuerpos → si insuficiente, `needs_cuerpos = true` y etapa inicial = `produccion_cuerpos`; si suficiente, etapa inicial = `estampacion`
- Para Sweatspot: evaluar stock y tipo de logo → determinar `workflow_type` (short/full) y etapa inicial = `estampacion`
- Descontar/reservar inventario (mantener lógica actual del inventoryStore)

#### 4. Crear hook `useProductionOrders`
Hook con React Query que:
- Lee las órdenes de producción desde `production_orders`
- Provee mutaciones para actualizar `stage_status` y avanzar etapa (`current_stage`)
- Al completar la última etapa, actualiza `production_status` en `orders` a `listo` y envía a logística

#### 5. Modificar `MagicalWarmersWorkflow` y `SweatspotWorkflow`
- Reemplazar los Zustand stores por el nuevo hook `useProductionOrders`
- Filtrar por marca
- Las tarjetas y botones de avance usarán las mutaciones del hook
- Los datos se actualizan en tiempo real para todos los usuarios

#### 6. Actualizar `production_status` en `orders` automáticamente
Cuando producción avanza de etapa, también actualizar el campo `production_status` en la tabla `orders` para que el asesor vea el progreso en "Mis Pedidos".

### Archivos a modificar/crear
- **Nueva migración SQL**: crear `production_orders` y `body_production_tasks` con RLS
- **Nuevo**: `src/hooks/useProductionOrders.ts`
- **Modificar**: `src/pages/Ventas.tsx` (insertar en `production_orders` al crear pedido)
- **Modificar**: `src/components/production/MagicalWarmersWorkflow.tsx` (usar hook en vez de store)
- **Modificar**: `src/components/production/SweatspotWorkflow.tsx` (usar hook en vez de store)

### Lógica de evaluación automática al crear pedido

```text
Pedido al por mayor creado en Ventas
  │
  ├─ Magical Warmers
  │   ├─ Verificar stock de cuerpos (inventoryStore.reserveBodyStock)
  │   │   ├─ Suficiente → needsCuerpos=false, etapa=estampacion
  │   │   └─ Insuficiente → needsCuerpos=true, etapa=produccion_cuerpos
  │   ├─ Descontar gel (inventoryStore.discountGelForMagical)
  │   └─ INSERT en production_orders
  │
  └─ Sweatspot
      ├─ Verificar stock de cuerpos (inventoryStore.reserveBodyStock)
      │   ├─ hasStock + impresión básica → workflow=short
      │   └─ Otro caso → workflow=full
      └─ INSERT en production_orders
```

