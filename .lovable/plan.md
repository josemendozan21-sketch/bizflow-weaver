## Cambios en Movimientos rápidos (Inventarios)

### 1. Solicitante como áreas predefinidas
En `QuickMovementForm.tsx`, cambiar el campo **Solicitante** de input de texto libre a un **Select** con opciones fijas:
- Estampación
- Producción
- Logística
- Punto 92
- Asesor comercial
- Feria
- Otro (que habilita un input de texto adicional)

Se sigue guardando en la columna existente `requested_by_name` (texto), así que no se requiere migración. Si eligen "Otro", se guarda el texto escrito.

### 2. Nueva categoría "Importados"
Agregar **Importados** como categoría en el formulario, además de las 3 existentes (Materia prima, Cuerpos, Producto terminado).

Para que funcione end-to-end:

**a) Frontend**
- Agregar `{ value: "importados", label: "Importados" }` al arreglo `CATEGORIES` en `QuickMovementForm.tsx`.
- Agregar la categoría también en `MovementHistoryTable.tsx` (filtros) y en el panel de inventario por marca (`CategorizedInventoryPanel.tsx`) para que los ítems importados aparezcan en su propia pestaña/sección.
- Actualizar `exportWeeklyInventory.ts` para que la hoja **Resumen** y **Stock final** incluyan la categoría Importados.
- Actualizar el tipo `InventoryCategory` en `src/stores/inventoryStore.ts` para incluir `"importados"`.

**b) Backend / datos**
- La tabla `stock_items` ya tiene `category` como texto libre, así que no requiere migración de esquema.
- Cuando me pases el Excel con los productos importados, los cargo a `stock_items` con `category = 'importados'` y la marca correspondiente (un INSERT masivo).

### 3. Archivos a editar
- `src/components/inventory/QuickMovementForm.tsx` — select de solicitante + nueva categoría
- `src/components/inventory/MovementHistoryTable.tsx` — filtro de categoría
- `src/components/inventory/CategorizedInventoryPanel.tsx` — pestaña Importados
- `src/lib/exportWeeklyInventory.ts` — incluir categoría en reportes
- `src/stores/inventoryStore.ts` — tipo `InventoryCategory`

### Pregunta
¿Quieres que **Punto 92** y **Feria** sean opciones separadas del solicitante, o solo las 3 áreas (Producción, Estampación, Logística) más "Punto 92" y "Otro"? Tu mensaje menciona explícitamente las 4, así que las dejo todas salvo que prefieras otra cosa.

Cuando apruebes este plan, implemento los cambios y quedo a la espera de tu Excel de importados para cargarlo.
