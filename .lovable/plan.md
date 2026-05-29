## Producción de mezcla de gel desde Materia Prima

Agregar un flujo en la pestaña **Materia Prima** (Inventarios) para registrar la producción de mezcla de gel a partir de la receta fija, descontando insumos y aumentando el stock de "Mezcla Gel".

### Receta fija (por batch = 30 kg de gel)
- Carbopol: 250 g
- Metil (incluye propil ya armado): 100 g
- Agua: 30 litros (= 30.000 ml o como se mida en stock)
- Trietanolamina: 150 ml

### UI
- Botón **"Producir mezcla de gel"** en el header del panel de Materia Prima, junto a "Agregar materia prima".
- Abre un diálogo con:
  - Input numérico **# de batches** (default 1).
  - Tabla preview: insumo requerido vs disponible, marcando en rojo los faltantes.
  - Resultado: **X kg de mezcla de gel** que se sumará al stock.
  - Botón **Confirmar producción** (deshabilitado si falta algún insumo).

### Lógica al confirmar
1. Validar que cada insumo tenga stock suficiente (qty × batches).
2. Por cada insumo: registrar un movimiento de **salida** en `inventory_movements` (area `produccion`, purpose `Producción mezcla de gel`), que descuenta vía el trigger existente `process_inventory_movement`.
3. Buscar el ítem **"Mezcla Gel"** en `stock_items` (category `materia_prima`) y registrar un movimiento de **entrada** por `30 × batches` kg → suma al stock.
4. Toast de éxito con resumen.

### Matching de insumos
Los nombres en BD pueden variar. Usaremos coincidencia normalizada (sin acentos, lowercase, contiene) sobre `stock_items` con `category = 'materia_prima'`:
- "carbopol"
- "metil"
- "agua"
- "trietanolamina"
- "mezcla gel" (destino)

Si algún ítem no existe en la base, mostrar advertencia clara con el nombre faltante para que lo creen primero.

### Archivos a tocar
- `src/components/inventory/MateriaPrimaPanel.tsx` — agregar botón + diálogo + handler.
- (Opcional) extraer la receta a una constante al inicio del archivo para fácil mantenimiento.

Sin cambios de schema; aprovecha tablas y triggers existentes (`stock_items`, `inventory_movements`).