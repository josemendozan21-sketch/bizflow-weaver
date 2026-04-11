

## Plan: Sembrar datos de Cuerpos y Producto Terminado en la base de datos + corregir bug de filtrado

### Problema
La base de datos solo tiene ítems con categoría `materia_prima`. Las categorías `cuerpos_referencias` y `producto_terminado` nunca fueron migradas del Zustand store a Supabase. Además, hay un bug en las líneas 144 y 311 del `CategorizedInventoryPanel` donde se filtra por `selectedBrand` (valor UI: `magical_warmers`) en vez de `dbBrand` (valor DB: `magical`), haciendo que los conteos de las pestañas y alertas sean siempre 0.

### Solución

#### 1. Migración SQL para sembrar datos faltantes
Crear una migración que inserte todos los ítems de `cuerpos_referencias` y `producto_terminado` para ambas marcas, usando `brand = 'magical'` y `brand = 'sweatspot'` (los valores reales de la DB). Incluye:

- **Magical Warmers - Cuerpos**: 18 ítems (9 Térmicos + 9 Fríos) con campo `product_type`
- **Magical Warmers - Producto Terminado**: 18 ítems (9 Térmicos + 9 Fríos) con campo `product_type`
- **Sweatspot - Producto Terminado**: 56 ítems con campos `color`, `logo`, `sweatspot_category`

Se usará `ON CONFLICT` o verificación previa para no duplicar si se ejecuta más de una vez.

#### 2. Corregir bug de filtrado en CategorizedInventoryPanel
En `src/components/inventory/CategorizedInventoryPanel.tsx`:
- **Línea 144**: cambiar `i.brand === selectedBrand` por `i.brand === dbBrand`
- **Línea 311**: cambiar `i.brand === selectedBrand` por `i.brand === dbBrand`

Esto corrige los conteos en las pestañas y los badges de alertas.

### Archivos a modificar
- Nueva migración SQL (seed de ~92 ítems)
- `src/components/inventory/CategorizedInventoryPanel.tsx` (2 líneas)

