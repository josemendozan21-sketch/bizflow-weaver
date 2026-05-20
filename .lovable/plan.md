## Objetivo

Simplificar las entradas y salidas de inventario para el rol **Inventarios** (producto terminado, materia prima y cuerpos por marca), capturar quién pide y para qué, marcar productos "en proceso", y permitir descargar un **Excel semanal** para alimentar el sistema de facturación.

---

## 1. Pestaña nueva: "Entradas / Salidas rápidas"

Dentro de `InventariosRoleView` agrego una pestaña **"Movimientos rápidos"** (antes de "Inventario por marca") con un formulario único y grande, optimizado para uso diario sin fricción.

Un solo formulario con:
- **Tipo**: Entrada (suma stock) / Salida (resta stock) / Marcar "En proceso" (no cambia stock, queda reservado)
- **Marca**: Magical / Sweatspot / etc. (chips grandes)
- **Categoría**: Materia prima / Cuerpos / Producto terminado (chips grandes)
- **Ítem**: selector filtrado por marca + categoría, muestra stock actual
- **Cantidad**
- **Solicitante (nombre libre)** — texto, ej. "Carlos – Producción"
- **Motivo / Para qué** — texto corto, ej. "Pedido cliente XYZ", "Reposición", "Compra a proveedor"
- **Proveedor** (solo si es Entrada por compra)
- Botón grande "Registrar"

El historial de los últimos movimientos aparece debajo en una tabla compacta con filtros por marca/categoría/semana.

---

## 2. Estado "En proceso" para ítems

Para que se vea qué unidades están comprometidas pero no entregadas:

- Nueva columna `in_process` (numeric, default 0) en `stock_items`.
- Nueva columna `direction` permite valor `"reserva"` y `"liberar_reserva"` en `inventory_movements` (o se maneja con un campo `movement_kind`).
- En las tarjetas de inventario por marca se mostrará:
  - **Disponible**: X
  - **En proceso**: Y (badge naranja)
  - **Total físico**: X + Y

Al registrar una **Salida** que viene de un movimiento "en proceso" previo, se descuenta automáticamente de `in_process`.

---

## 3. Captura de "quién pide y para qué"

Hoy `inventory_movements` ya tiene `reason` y `recorded_by_name`. Agrego dos columnas explícitas:
- `requested_by_name` (text) — quién solicita
- `purpose` (text) — para qué / a qué pedido

Estos campos se muestran en el historial y van al Excel semanal.

---

## 4. Descarga Excel semanal para facturación

Botón **"Descargar Excel semanal"** en la pestaña de movimientos, con selector de semana (por defecto: semana actual lun–dom).

El archivo `.xlsx` tendrá 4 hojas:

1. **Resumen** — por marca + categoría: entradas, salidas, en proceso, stock final.
2. **Movimientos** — detalle: fecha, tipo, marca, categoría, ítem, cantidad, solicitante, propósito, registrado por.
3. **Stock final por ítem** — listado completo con unidades para cargar al sistema de facturación (columnas: SKU/Nombre, Marca, Categoría, Unidades disponibles, En proceso).
4. **Entradas por compra** — solo entradas con proveedor, para conciliación contable.

Implementado con `xlsx` (ya disponible en el proyecto vía `exportSiigo`).

---

## Detalles técnicos

**Migración SQL**:
- `ALTER TABLE stock_items ADD COLUMN in_process numeric NOT NULL DEFAULT 0;`
- `ALTER TABLE inventory_movements ADD COLUMN requested_by_name text, ADD COLUMN purpose text, ADD COLUMN movement_kind text NOT NULL DEFAULT 'salida';` (valores: `entrada`, `salida`, `reserva`, `liberar_reserva`)
- Actualizar trigger `process_inventory_movement` para manejar los 4 tipos y mover entre `available` ↔ `in_process` correctamente.

**Archivos a crear**:
- `src/components/inventory/QuickMovementForm.tsx` — formulario unificado
- `src/components/inventory/MovementHistoryTable.tsx` — historial filtrable
- `src/components/inventory/WeeklyInventoryExport.tsx` — botón + lógica xlsx
- `src/lib/exportWeeklyInventory.ts` — generación del Excel

**Archivos a editar**:
- `src/components/inventory/InventariosRoleView.tsx` — nueva pestaña "Movimientos"
- `src/hooks/useInventoryMovements.ts` — agregar `requested_by_name`, `purpose`, `movement_kind`
- `src/components/inventory/CategorizedInventoryPanel.tsx` — mostrar badge "En proceso"

---

## Preguntas antes de implementar

1. **"En proceso"**: ¿quieres que sea una reserva real (resta de disponible y suma a "en proceso") o solo un marcador visual sin afectar disponibilidad?
2. **Semana del Excel**: ¿lunes–domingo o domingo–sábado?
3. **Sistema de facturación**: ¿el Excel debe seguir algún formato específico (Siigo, Alegra, World Office)? Si me dices cuál, ajusto las columnas exactas de la hoja "Stock final".
