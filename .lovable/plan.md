## Movimientos de inventario entre áreas

Registrar entregas, devoluciones y retornos de producto/insumos entre Inventarios y las demás áreas, **sin saldos acumulados** — solo historial cronológico que descuenta o suma al stock central de Inventarios.

## Modelo de datos

Nueva tabla `inventory_movements`:

- `stock_item_id` (referencia al item de `stock_items`)
- `item_name`, `brand`, `category` (snapshot legible)
- `quantity` (numeric, > 0)
- `direction`: `entrega` | `retorno` (entrega = sale del stock central; retorno = vuelve al stock central)
- `area`: `produccion` | `estampacion` | `logistica` | `asesor_comercial` | `feria`
- `feria_id` (uuid, opcional — solo cuando `area = feria`)
- `reason` (texto libre)
- `order_id` (opcional — para ligar a un pedido)
- `recorded_by`, `recorded_by_name`, `recorded_at`

**Trigger `process_inventory_movement()`** (BEFORE INSERT):
- Si `direction = entrega`: valida `stock_items.available >= quantity` y descuenta.
- Si `direction = retorno`: suma a `stock_items.available`.
- Notifica al área destino (al área que recibe la entrega, o a Inventarios cuando es retorno).

**RLS**: solo `inventarios` y `admin` pueden insertar / ver / actualizar. (Las demás áreas ven el efecto en sus notificaciones, no en la tabla).

## UI — nuevo panel

`InventoryMovementsPanel.tsx`, dentro del tab **Recepción de pedidos** del rol Inventarios, debajo de Solicitudes y Suministros.

Contiene:

1. **Botón "Registrar movimiento"** → diálogo con:
   - Tipo: Entrega / Retorno (radio)
   - Área destino: Producción · Estampación · Logística · Asesor · **Feria** (al elegir Feria, aparece un selector de feria activa)
   - Marca + ítem (autocomplete sobre `stock_items`, muestra disponible actual)
   - Cantidad
   - Motivo (texto)
   - Pedido relacionado (opcional)
2. **Tabla de historial** (últimas 100, scroll y filtros):
   - Columnas: Fecha · Tipo (badge entrega/retorno) · Área · Ítem · Cantidad · Motivo · Registrado por
   - Filtros rápidos: por área, por tipo, por marca, búsqueda por ítem.
3. **Sin columna de "saldo por área"** — se omite por decisión del usuario.

## Caso especial Ferias

Inventarios entrega producto a Logística para una feria → se registra como movimiento `entrega` al área `logistica` con el `feria_id` indicado en el motivo / campo. Logística sigue siendo quien dispacha físicamente; este movimiento solo deja constancia y descuenta el stock central. **No se duplica con `feria_inventory`** — esa tabla la sigue manejando Logística.

## Archivos a crear / tocar

- **Migración**: tabla `inventory_movements` + trigger + RLS.
- **Nuevo**: `src/components/inventory/InventoryMovementsPanel.tsx`
- **Nuevo**: `src/components/inventory/RegisterMovementDialog.tsx`
- **Nuevo**: `src/hooks/useInventoryMovements.ts`
- **Editar**: `src/components/inventory/InventariosRoleView.tsx` — agregar `<InventoryMovementsPanel />` en el tab "Recepción".

## Lo que NO cambia

- Flujo actual de `inventory_requests` (solicitudes) sigue igual; este panel es complementario.
- `feria_inventory` y dispatch de Logística sin cambios.
- Stock por área no se calcula ni se almacena.
