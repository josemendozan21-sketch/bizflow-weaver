# Unificación de componentes y limpieza de redundancias

Basado en el video: quitar información repetida en inventario, hacer visible el toggle de stock y volver los componentes (cards, tipografías, tamaños) una sola unidad visual.

## 1. Inventario Magical sin redundancia (una fila por referencia)

Hoy "Círculo 12 Frío" y "Círculo 12 Térmico" son dos filas y el tipo se repite en el nombre y en el detalle. Se cambia a una fila por referencia base con las dos cantidades en columnas:

```text
FAMILIA CÍRCULO · 6 refs · 1.240 u
Referencia            ❄️ Frío     🔥 Térmico     Estado
Círculo 12 cm             320           180      Disponible
Círculo 8 cm                0            45      Bajo
Banda cefálica            120            —       Disponible
```

- Nombre limpio, sin el sufijo Frío/Térmico y sin badge de tipo repetido.
- Columnas Frío y Térmico con la cantidad (o "—" cuando esa variante no existe).
- Una sola columna Estado con la etiqueta del total (Disponible / Bajo / Agotado), como se pedía en el video.
- El filtro "Tipo" sigue existiendo: al elegir Frío o Térmico se muestra solo esa columna.
- Aplica igual en las pestañas Cuerpos y Producto terminado.

## 2. Inventario Sweatspot sin redundancia

- Mismo criterio: se agrupan las dos variantes de una misma referencia (con logo / marcable) en una fila con dos columnas de cantidad, y el nombre no repite el color/tamaño que ya se muestra como atributo.
- Estado único por referencia, igual que en Magical.

## 3. "Solo con stock" visible

- Sale del menú de opciones y vuelve a la barra principal como un toggle visible junto a los filtros (con etiqueta corta "Con stock"), igual en ambas marcas.
- En el menú de opciones queda solo el orden A-Z / Z-A.

## 4. Cards unificadas (inventario y ventas)

- Se crea un componente único `SelectionCard` con el estilo actual del selector de marca de Inventarios: título, descripción, ícono chevron a la derecha y hover sutil de borde.
- Se usa en: selección de marca de Inventarios, selección de marca en Ventas (Sweatspot / Magical Warmers) y selección de tipo de venta (Al por mayor / Al por menor), reemplazando `BrandCard` y `SaleTypeCard`.

## 5. Unidad tipográfica

- Se crea `PageHeader` (título + descripción con el mismo tamaño y peso) y se aplica en Ventas e Inventarios.
- Escala unificada en estas vistas: título de página `text-2xl font-semibold`, títulos de sección `text-base font-medium`, encabezados de tabla `text-[11px] uppercase text-muted-foreground`, texto de tabla `text-sm`, metadatos `text-xs text-muted-foreground`.
- Se eliminan tamaños sueltos (`text-xl font-bold` dentro de las cards, `text-lg font-semibold` mezclado) para que todo use la misma escala.

## Detalle técnico

- `src/lib/inventoryFacets.ts`: nueva función `buildVariantRows(items, getValues, variantKey)` que agrupa por clave base (nombre limpio + atributos distintos al de variante) y devuelve una fila con `variants: Record<string, { available, id }>` y `totalAvailable`. Puro y con pruebas nuevas en `inventoryFacets.test.ts`.
- `src/components/inventory/AsesorInventoryView.tsx`: usa esas filas; columnas dinámicas según el filtro de tipo/logo activo; `StockDot` pasa a mostrar el estado del total.
- `src/components/inventory/GroupedInventoryTable.tsx`: se generaliza a filas de tipo variante (mismo componente, `getRowKey` sobre la clave base).
- `src/components/inventory/FacetFilterBar.tsx`: toggle "Con stock" en la fila principal (`Toggle`/`Switch` compacto); menú de opciones solo con orden.
- Nuevos `src/components/ui/selection-card.tsx` (o `src/components/common/SelectionCard.tsx`) y `src/components/common/PageHeader.tsx`; `src/pages/Ventas.tsx` reemplaza `BrandCard`/`SaleTypeCard` por el compartido.
- Sin cambios de datos, permisos ni lógica de negocio: solo presentación y agrupación en la vista.
