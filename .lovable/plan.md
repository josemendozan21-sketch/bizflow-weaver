

## Plan: Corregir desajuste de nombres de marca entre UI y base de datos

### Problema
La base de datos almacena las marcas como `"magical"` y `"sweatspot"`, pero el tipo `InventoryBrand` en el código usa `"magical_warmers"`. Cuando el componente `CategorizedInventoryPanel` filtra con `i.brand === selectedBrand`, compara `"magical"` (DB) contra `"magical_warmers"` (UI) y no encuentra coincidencias.

### Solucion

Crear un mapa de traduccion entre los valores de la UI y los valores de la base de datos, aplicandolo en los puntos de filtrado y de insercion.

### Detalle tecnico

**Archivo: `src/components/inventory/CategorizedInventoryPanel.tsx`**
- Agregar un mapa `BRAND_DB_MAP` que traduzca `"magical_warmers" -> "magical"` y `"sweatspot" -> "sweatspot"`
- En el filtro de `filteredItems` (linea 91-93), usar `BRAND_DB_MAP[selectedBrand]` en lugar de `selectedBrand` directamente
- En `handleAdd`, pasar el valor mapeado de marca a `addStockItem`

**Archivo: `src/components/inventory/BrandSelectionCards.tsx`**
- Aplicar el mismo mapa de traduccion al filtrar `stockItems` por marca

Esto resuelve el problema sin necesidad de migrar datos en la base de datos ni cambiar el tipo `InventoryBrand`.

