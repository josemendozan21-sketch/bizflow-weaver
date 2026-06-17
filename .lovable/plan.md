## Objetivo

Dejar el inventario de Sweatspot exactamente como está en el archivo `Inventario_Sweatspot.xlsx` (≈68 referencias) y permitir que los asesores que venden al por mayor distingan claramente las unidades **CON LOGO** (no marcables sin sobre-estampado) de las unidades **SIN LOGO** (marcables).

---

## 1. Reemplazar inventario Sweatspot

Migración que en una sola transacción:

1. Borra todas las filas de `stock_items` donde `brand = 'sweatspot'` y `category = 'producto_terminado'`.
2. Inserta una fila por cada línea del Excel con:
   - `name`: producto completo (ej. `TERMO 250 ROSADO CORREA`)
   - `color`: del Excel
   - `logo`: `'Sweatspot'` si la columna dice `LOGO`, `NULL` si dice `SIN LOGO`
   - `product_type`: `IMPORTADO` / `NACIONAL` (lo guardamos aquí para filtrar origen)
   - `sweatspot_category`: derivado de `Referencia`:
     - `150` → `termos_150`
     - `250` → `termos_250`
     - `500` → `termos_500`
     - `Canguro` → `canguros`
     - `Chaleco` → `chalecos`
     - `Imanes`, `MANGAS` → nueva categoría `accesorios`
   - `available`: del Excel
   - `min_stock`: 0 (el Excel no trae mínimos)
   - `unit`: `Unidades`

Cada variante (normal, **CORREA**, **JUGUETÓN**) queda como ítem independiente porque ya viene diferenciada en el `name` del Excel.

## 2. Ajustar normalizador / índice único

El trigger `normalize_stock_item_name` y el índice `stock_items_canonical_uniq` actuales colapsan filas que tengan el mismo `(brand, category, lower(name), product_type)`. Como ahora dos filas pueden compartir nombre y diferenciarse solo por `logo`, ampliamos:

- Cambiar el índice único a `(brand, category, lower(name), coalesce(product_type,''), coalesce(logo,''), coalesce(color,''))`.
- Mantener el trigger que limpia sufijos `(Frío)/(Térmico)` — no aplica a Sweatspot.

## 3. Añadir categoría `accesorios` al filtro

`SweatspotFinishedProducts.tsx` y `stores/inventoryStore.ts`:

- Extender `SweatspotProductCategory` con `'accesorios'`.
- Agregar chip `Accesorios` en `FILTER_OPTIONS`.

## 4. Vista para asesores mayoristas (CON / SIN LOGO)

En `SweatspotFinishedProducts.tsx` (y en la vista paralela del asesor `AsesorInventoryView.tsx`):

- **Agrupar por producto base** (mismo `name` sin variar logo). Por cada grupo mostrar dos columnas:
  - `SIN LOGO` (marcable) — destacado
  - `CON LOGO Sweatspot`
- Mantener edición inline en cada fila por separado.
- **Toggle "Solo SIN LOGO (mayoristas con marcación)"** arriba del listado: cuando está activo oculta las filas con logo y suma totales solo de la columna SIN LOGO.
- Indicador visual claro (badge azul "MARCABLE" en SIN LOGO; badge gris "YA MARCADO" en CON LOGO).

## 5. Detalles técnicos

```text
Archivo -> tabla stock_items
  Producto       -> name
  Color          -> color
  LOGO/SIN LOGO  -> logo ('Sweatspot' | NULL)
  IMPORTADO/NAC. -> product_type
  Referencia     -> sweatspot_category (mapeado)
  Disponible     -> available
```

Archivos a tocar:

- `supabase/migrations/<nueva>.sql` (delete + 68 inserts + nuevo índice único)
- `src/stores/inventoryStore.ts` (agregar `'accesorios'` al type)
- `src/components/inventory/SweatspotFinishedProducts.tsx` (chip Accesorios, agrupación CON/SIN LOGO, toggle mayorista)
- `src/components/inventory/AsesorInventoryView.tsx` (mismo toggle y vista de dos columnas para Sweatspot)

No se cambia ninguna lógica de descuento de stock, ni el flujo de pedidos, ni POS.

## 6. Verificación

- Conteo posterior a la migración: `SELECT count(*)` = nº de filas del Excel.
- Spot check: `TERMO 250 ROSADO JUGUETON SIN LOGO` = 149, `TERMO 250 TRANSPARENTE SIN LOGO` = 263.
- Pantalla `Inventarios → Sweatspot → Termos 250`: aparecen ambas columnas por color y el toggle mayorista funciona.
