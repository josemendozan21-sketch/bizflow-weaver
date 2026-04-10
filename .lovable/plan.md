

## Plan: Sistema de notificaciones por rol al crear pedidos

### Objetivo
Cuando un asesor comercial crea un pedido al por mayor, el sistema debe notificar automáticamente a los roles involucrados y crear las órdenes de producción/reabastecimiento necesarias.

### Diseño

**Nueva tabla `notifications` en Supabase** para almacenar notificaciones persistentes por usuario/rol:

```text
notifications
├── id (uuid, PK)
├── target_role (app_role) — rol destinatario
├── target_user_id (uuid, nullable) — usuario específico (opcional)
├── title (text)
├── message (text)
├── type (text) — "nuevo_pedido", "bajo_inventario", "diseno_logo", "produccion"
├── reference_id (uuid, nullable) — ID del pedido/orden relacionada
├── read (boolean, default false)
├── created_at (timestamptz)
```

**Notificaciones generadas al crear un pedido:**

| Rol | Tipo | Condición |
|-----|------|-----------|
| produccion | nuevo_pedido | Siempre (nuevo pedido entra a producción) |
| produccion | bajo_inventario | Cuando `needsCuerpos = true` (auto-crear supply order ya funciona) |
| disenador | diseno_logo | Cuando se sube un logo (ya se crea `logo_request`, ahora también notificación) |
| contabilidad | nuevo_pedido | Siempre (para registro financiero) |
| logistica | nuevo_pedido | Siempre (para preparar despacho futuro) |
| asesor_comercial | confirmacion | Al propio asesor, confirmando su pedido |

**Componente de notificaciones en el sidebar/header:**
- Icono de campana con badge de conteo de no leídas
- Dropdown con lista de notificaciones recientes
- Click en notificación la marca como leída
- Filtrado automático por rol del usuario logueado

### Cambios propuestos

#### 1. Migración SQL
- Crear tabla `notifications` con RLS (cada rol solo ve sus notificaciones)
- Habilitar realtime en la tabla
- Políticas: SELECT filtrado por `target_role` o `target_user_id`, INSERT para roles autorizados

#### 2. `src/hooks/useNotifications.ts` (nuevo)
- Hook con `useQuery` para traer notificaciones del rol actual
- Suscripción realtime para notificaciones nuevas
- Mutation `markAsRead` y `markAllAsRead`
- Función `createOrderNotifications(orderData)` que inserta las notificaciones relevantes

#### 3. `src/components/NotificationBell.tsx` (nuevo)
- Campana en el sidebar/header con badge de no leídas
- Popover con lista scrolleable de notificaciones
- Cada item muestra tipo, mensaje, tiempo relativo y estado leído/no leído

#### 4. `src/pages/Ventas.tsx` — MagicalMayorForm y SweatspotMayorForm
- Después de crear el pedido y la production_order, llamar `createOrderNotifications()` que inserta en batch las notificaciones para cada rol
- Si `needsCuerpos`, la notificación a producción incluye el detalle de cantidad faltante

#### 5. `src/components/AppSidebar.tsx` o `src/components/DashboardLayout.tsx`
- Agregar el componente `NotificationBell` visible para todos los roles

### Archivos a crear/modificar
- **Nuevo:** Migración SQL para tabla `notifications`
- **Nuevo:** `src/hooks/useNotifications.ts`
- **Nuevo:** `src/components/NotificationBell.tsx`
- **Modificar:** `src/pages/Ventas.tsx` — agregar llamada a crear notificaciones
- **Modificar:** `src/components/AppSidebar.tsx` o `DashboardLayout.tsx` — agregar campana

### Resultado esperado
Al crear un pedido de "Lumbar Frío, 1000 unidades":
1. Producción recibe notificación: "Nuevo pedido: 1000 uds Lumbar (Frío) — Magical Warmers" + alerta de bajo inventario si aplica
2. Diseñador recibe notificación si se subió logo: "Nueva solicitud de diseño para [cliente]"
3. Contabilidad y Logística reciben aviso del nuevo pedido
4. El asesor ve confirmación de su pedido creado
5. Todos ven la campana con badge actualizado en tiempo real

