## Nuevo rol: Inventarios

Crear un rol dedicado al manejo de inventarios, separado de producción y asesores.

### 1. Base de datos (migración)

- Agregar valor `inventarios` al enum `app_role`.
- Actualizar políticas RLS para darle acceso a este rol en:
  - `stock_items`: SELECT + INSERT + UPDATE (todas las marcas y categorías).
  - `body_stock`: SELECT + UPDATE.
  - `body_production_tasks`: SELECT + INSERT + UPDATE (para solicitar cuerpos a producción).
  - `production_supply_orders`: SELECT + INSERT + UPDATE (para solicitar materia prima/cuerpos).
  - `notifications`: poder crear notificaciones hacia `produccion`.

### 2. Permisos en frontend (`src/lib/rolePermissions.ts`)

- Agregar `inventarios` al mapa de roles.
- Rutas permitidas: solo `/inventarios`.
- Secciones editables: `/inventarios`.
- Etiqueta visible: "Inventarios".

### 3. Vista de Inventarios para el rol

En `src/pages/Inventarios.tsx`, cuando el rol sea `inventarios`, mostrar una vista especializada con tres bloques:

**a) Inventario por marca (Magical y Sweatspot)**
- Reutilizar `BrandSelectionCards` + `CategorizedInventoryPanel` (ya soportan ambas marcas y todas las categorías: materia prima, cuerpos, producto terminado, importados).
- El rol puede editar cantidades (ingresar materia prima, productos importados, producto terminado).

**b) Solicitar producción de cuerpos**
- Botón / panel "Solicitar cuerpos a producción" que cree un registro en `body_production_tasks` con:
  - tipo_plastico (frío/caliente)
  - referencia (selector de cuerpos existentes por marca)
  - unidades
  - status: `pendiente`
- Genera notificación automática al rol `produccion`.

**c) Recepción de pedidos desde producción**
- Listado de `production_supply_orders` con `status` pendiente/en_proceso, donde el rol Inventarios puede marcar como recibido (status `completado`) e incrementar automáticamente el stock correspondiente en `stock_items` o `body_stock`.
- Formulario rápido de "Ingresar materia prima / producto importado / producto terminado" que aumenta cantidades en `stock_items` (con selector de marca, categoría, ítem y cantidad).

### 4. Sidebar y AuthContext

- `AppSidebar` ya filtra por `canAccessRoute`, así que sólo verá "Inventarios" automáticamente.
- Asegurar que el `AuthContext` reconozca el nuevo rol (ya usa `get_user_role` genérico).

### 5. Asignación de usuarios

- El admin podrá asignar el nuevo rol desde `/admin-usuarios` (ya usa el enum dinámicamente con `getRoleLabel`, sólo agregar la etiqueta).

### Detalles técnicos

- Enum update en Postgres requiere `ALTER TYPE app_role ADD VALUE 'inventarios';` (una sola sentencia, fuera de transacción si es necesario).
- Tras actualizar el enum hay que añadir las policies nuevas en una segunda migración o en el mismo archivo separadas por `COMMIT`.
- Reusar componentes existentes para evitar duplicar UI; sólo crear dos componentes nuevos:
  - `src/components/inventory/RequestBodyProductionDialog.tsx`
  - `src/components/inventory/SupplyReceptionPanel.tsx`
- Vista contenedora: `src/components/inventory/InventariosRoleView.tsx` que orquesta los tres bloques en tabs.

### Preguntas abiertas

1. ¿El usuario con rol `inventarios` debe poder ver también las órdenes (pedidos de venta) para saber qué cuerpos producir, o sólo el inventario y las solicitudes a producción?
2. Al recibir materia prima/importados, ¿debe quedar registro histórico (quién recibió, cuándo, cantidad) o basta con incrementar el stock?
