
# Solicitudes de Feria a Logística + Módulo Feria Punto de Venta

## Objetivo

1. Cuando el admin asigna inventario a una feria, esa lista se convierte en una **solicitud de despacho** que aparece en Logística. Logística ve cuántas unidades fueron pedidas y registra cuántas realmente despacha (más mobiliario opcional).
2. Crear el módulo **Feria Punto de Venta (POS)**, accesible por un nuevo rol dedicado (`feria_pos`), donde solo se ve el inventario realmente despachado por logística para la feria asignada y se registran ventas en modo rápido o detallado.

---

## Parte 1 — Solicitud de despacho a Logística

### Cambios en base de datos

Nueva tabla `feria_dispatch_requests` (una por feria):
- `id`, `feria_id`, `status` (`pendiente`, `parcial`, `despachado`)
- `dispatched_at`, `dispatched_by`, `dispatch_notes`
- `furniture_items` (text[]) — mobiliario despachado (mesas, sillas, racks…)
- `furniture_dispatched` (boolean)

Nuevas columnas en `feria_inventory`:
- `quantity_dispatched` (int, default 0) — lo que log\u00edstica realmente envió
- `dispatch_status` (`pendiente` | `despachado`)

RLS:
- Admin: full access.
- Logística y Contabilidad: SELECT + UPDATE.
- Nuevo rol `feria_pos`: SELECT solo de su feria (ver Parte 3).

### Flujo en la pestaña "Inventario asignado" (FeriaInventoryTab)

- El admin sigue agregando productos como hoy (esa es la "solicitud").
- Al lado del botón "Asignar producto" se agrega un botón **"Enviar a logística"** que:
  - Crea/actualiza el registro `feria_dispatch_requests` con status `pendiente`.
  - Notifica al rol `logistica`.
- La tabla muestra una nueva columna **Estado despacho** (Pendiente / Despachado / Parcial).

### Cambios en `Logistica.tsx`

Nueva pestaña **"Ferias"** junto a Listos / Pendientes / Despachados.

Cada fila muestra:
- Nombre de la feria, ciudad, fechas.
- Tabla con: Producto · Marca · **Pedido** · **Despacho** (input editable) · Restante.
- Sección **Mobiliario**: checkbox "¿Despacha mobiliario?" + lista editable (mesas, sillas, etc.).
- Botón **"Confirmar despacho"** que:
  - Guarda `quantity_dispatched` por línea.
  - Marca cada línea como `despachado`.
  - Marca `feria_dispatch_requests.status = 'despachado'` (cierra el ciclo: el faltante NO se reabastece automáticamente — solo queda registrado lo que realmente salió).
  - Notifica al rol `feria_pos` y al admin.

### Hooks nuevos en `useFerias.ts`

- `useFeriaDispatchRequest(feriaId)`
- `useCreateDispatchRequest()`
- `useConfirmDispatch()` — actualiza cantidades y estado.

---

## Parte 2 — Módulo Feria Punto de Venta

### Nueva ruta y página

- Ruta: `/feria-pos`
- Página: `src/pages/FeriaPOS.tsx`
- Sidebar: nuevo item visible solo para roles `feria_pos` y `admin`.

### Estructura de la página

Selector superior con la **feria activa** (la que tenga despacho confirmado y status `en_curso`; si hay varias, dropdown). Para usuarios `feria_pos` se autoselecciona su única feria asignada.

Tres tabs:

1. **Vender (rápido)** — vista tipo POS:
   - Grid de tarjetas grandes por producto despachado, mostrando nombre, precio y stock restante (`quantity_dispatched - vendido`).
   - Tap a una tarjeta agrega 1 unidad a un "carrito" lateral.
   - Carrito: ajustar cantidad, total, selector de método de pago, botón **"Cobrar"**.
   - Productos con stock 0 quedan deshabilitados.

2. **Vender (detallado)** — formulario completo con cliente/notas (reusa el de `FeriaSalesTab` adaptado para mostrar solo productos despachados).

3. **Mis ventas** — tabla con las ventas registradas por el usuario actual en esta feria, con total del día.

Las ventas se siguen guardando en `feria_sales` (sin cambios estructurales más allá de respetar `recorded_by`).

### Stock disponible en POS

Se calcula en cliente:
```
restante = quantity_dispatched - SUM(feria_sales.quantity por producto)
```
La pestaña "Inventario asignado" del admin también empieza a usar `quantity_dispatched` (no `quantity_assigned`) para calcular el restante una vez confirmado el despacho.

---

## Parte 3 — Nuevo rol `feria_pos`

### Migración de enum

Agregar valor `feria_pos` al enum `app_role`.

### `rolePermissions.ts`

```
feria_pos: ["/feria-pos"]    // solo esta ruta
```
Edit sections: `["/feria-pos"]` (puede registrar ventas).

Label: "Feria Punto de Venta".

### Asignación de feria al usuario POS

Nueva tabla `feria_pos_assignments`:
- `user_id`, `feria_id`, `assigned_at`
- RLS: admin gestiona; el propio usuario puede leer su asignación.

En `AdminUsuarios.tsx`: cuando se crea un usuario con rol `feria_pos`, mostrar un selector de feria activa para asignar.

### RLS adicional

- `feria_inventory`, `feria_sales`, `ferias`: agregar policies SELECT/INSERT para `feria_pos` limitadas a su feria asignada (`EXISTS feria_pos_assignments WHERE user_id = auth.uid() AND feria_id = ...`).

---

## Detalles técnicos

**Archivos nuevos:**
- `src/pages/FeriaPOS.tsx`
- `src/components/feria-pos/QuickSaleGrid.tsx`
- `src/components/feria-pos/Cart.tsx`
- `src/components/feria-pos/MySalesTab.tsx`
- `src/components/logistics/FeriaDispatchTab.tsx`
- `src/components/logistics/FeriaDispatchCard.tsx`

**Archivos modificados:**
- `src/App.tsx` — nueva ruta `/feria-pos`.
- `src/components/AppSidebar.tsx` — nuevo item de menú.
- `src/lib/rolePermissions.ts` — rol `feria_pos`.
- `src/pages/Logistica.tsx` — nueva tab "Ferias".
- `src/components/ferias/FeriaInventoryTab.tsx` — botón "Enviar a logística" + columna estado despacho.
- `src/hooks/useFerias.ts` — nuevos hooks de despacho.
- `src/pages/AdminUsuarios.tsx` — asignación de feria al crear `feria_pos`.
- `src/integrations/supabase/types.ts` — se regenera solo.

**Migraciones SQL:**
1. `ALTER TYPE app_role ADD VALUE 'feria_pos';`
2. `CREATE TABLE feria_dispatch_requests (...)` + RLS.
3. `ALTER TABLE feria_inventory ADD COLUMN quantity_dispatched int DEFAULT 0, dispatch_status text DEFAULT 'pendiente';`
4. `CREATE TABLE feria_pos_assignments (...)` + RLS.
5. Nuevas policies en `feria_inventory`, `feria_sales`, `ferias` para `feria_pos`.

**Comportamiento del faltante (decisión confirmada):** al confirmar despacho, lo no enviado se descarta — solo lo despachado queda visible en POS. No se crea tarea de producción automática.
