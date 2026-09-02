# Flujo automatizado de salidas y entradas de ferias

Hoy el administrador crea la feria y carga manualmente el inventario proyectado, y esa carga no descuenta nada de la bodega. La idea es que Inventario haga el despacho real desde un checklist, que el stock se descuente solo, y que se puedan registrar varias salidas y una sola entrada de retorno.

## Cómo va a funcionar

1. **Admin crea la feria** (igual que hoy) con su proyección de productos.
2. **Inventario abre la feria** desde su módulo (bodega "Ferias") y ve dos secciones: Salidas y Entrada (retorno).
3. **Nueva salida**: se abre un checklist con las referencias de producto terminado de Magical y Sweatspot (con buscador y filtro por marca, y marcado/sin marcar). Se seleccionan ítems y se escribe la cantidad de cada uno. El panel muestra el disponible en bodega y bloquea cantidades mayores.
4. Al **confirmar la salida** se numera automáticamente (Salida 1, Salida 2, 3…), se descuenta de bodega, se registra el movimiento de inventario (área feria) y se suma a lo enviado de la feria. La salida queda cerrada y no editable; solo se puede anular (reversa completa) mientras la feria no esté finalizada.
5. **Entrada de retorno**: una sola entrada por feria que consolida automáticamente todo lo que salió en Salida 1, 2, 3… sin importar de cuál salida vino. Se muestra por producto: enviado total, vendido (según ventas de la feria), sugerido a retornar y un campo editable de cantidad que realmente regresa.
6. Al **confirmar la entrada**, esas unidades vuelven a sumar al inventario de bodega, se registran los movimientos de entrada y se marca la diferencia (enviado − vendido − retornado) como faltante para revisión.
7. Todo queda en la trazabilidad y en el historial de cambios existentes, con usuario, fecha y hora.

## Vistas afectadas

- **Inventario (rol inventarios y admin)**: bodega "Ferias" pasa de solo lectura a un panel operativo con selector de feria, tarjetas de resumen (enviado, vendido, retornado, pendiente), lista de salidas y la entrada de retorno.
- **Detalle de feria (admin)**: se agrega la lista de salidas realizadas y el estado del retorno, en modo lectura; la carga proyectada actual se mantiene sin cambios.
- **Punto de feria (POS)**: sin cambios; sigue vendiendo contra lo enviado.

## Detalles técnicos

Base de datos (migración):

- `feria_shipments`: `feria_id`, `shipment_number` (consecutivo por feria), `direction` (`salida` | `entrada`), `status` (`confirmada` | `anulada`), `notes`, `confirmed_by`, `confirmed_by_name`, `confirmed_at`, timestamps. Índice único `(feria_id, direction, shipment_number)` y único parcial para una sola entrada confirmada por feria.
- `feria_shipment_items`: `shipment_id`, `stock_item_id`, `item_name`, `brand`, `logo`, `quantity`, `unit_price`, `unit_cost`.
- GRANTs para `authenticated` y `service_role`, RLS: lectura para roles con acceso a ferias (admin, inventarios, logística, contabilidad, visualizador), escritura solo admin e inventarios.
- El descuento/reintegro de bodega se hace insertando en `inventory_movements` con `area = 'feria'`, `feria_id` y `movement_kind` `salida`/`entrada`, reutilizando el trigger `process_inventory_movement` que ya actualiza `stock_items` — no se duplica lógica de stock.
- Trigger que, al confirmar una salida/entrada, sincroniza `feria_inventory.quantity_dispatched` / `quantity_returned` por producto (creando la fila si el producto no estaba en la proyección).

Frontend:

- `src/hooks/useFeriaShipments.ts`: consultas y mutaciones (crear salida con ítems, anular, confirmar entrada consolidada).
- `src/components/inventory/FeriaShipmentDialog.tsx`: checklist de referencias con buscador, filtro de marca y cantidades.
- `src/components/inventory/FeriaReturnPanel.tsx`: consolidado de retorno con cantidades editables.
- `src/components/inventory/FeriasWarehousePanel.tsx`: se reescribe para incluir salidas, entrada y el resumen; conserva la tabla actual de disponible.
- `src/components/ferias/FeriaInventoryTab.tsx`: se le agrega una sección de solo lectura con las salidas y el retorno.

## Fuera de alcance

- No se cambia el cálculo de comisiones, proyecciones ni el POS de feria.
- No se toca la carga proyectada que hace el admin al crear la feria.
