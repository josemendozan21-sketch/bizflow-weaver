# Filtros por referencia en el Punto de la 92

Hoy en inventario y en la pantalla de venta solo se puede filtrar por marca (y por proveedor en nutrición). La idea del video: organizar también por **referencia** (termos, canguros, camisas, chalecos, medias, accesorios…) y dentro de cada una por **subreferencia** (Termos → 500 ml, 250 ml, 150 ml), con el mismo comportamiento en ventas y en inventario.

## Qué se va a hacer

1. **Cada producto tendrá referencia y subreferencia.**
   Se clasifican automáticamente leyendo el nombre (por ejemplo "Termo 250 ml + Correa Negro" → Termos / 250 ml; "Canguro con cremallera Azul" → Canguros / Con cremallera; "Media de compresión LARGAS" → Medias / Compresión). Lo que no se pueda clasificar queda como "Sin referencia" y se corrige a mano.

2. **Referencias iniciales propuestas** (ajustables):
   Termos (500 ml, 250 ml, 150 ml, Jugueton, Repuestos), Canguros (con cremallera, con botellas, free belt), Camisas y camisetas (camibuso, camisilla, camiseta, crop top, top), Pantalonetas y licras (short, licra, pant, biker), Chalecos, Medias (compresión, antideslizantes, tobilleras), Gorras y viseras (gorra, visera, gorro), Magical Warmers (calor, frío, kits), Accesorios (imanes, mangas, bib number, correas, varios), Nutrición (geles, bebidas, electrolitos, gomas, barras).

3. **Filtros en inventario del punto**: debajo de las marcas aparecen chips de referencia y, al elegir una, los chips de subreferencia. Se combinan con marca, proveedor y búsqueda; la búsqueda también encuentra por referencia.

4. **Filtros en la pantalla de venta del punto**: los mismos chips y el mismo orden, para que quien atienda encuentre igual que en inventario.

5. **Edición**: la ficha del producto suma los campos Referencia y Subreferencia (lista desplegable con opción de escribir una nueva), y el Excel del catálogo suma esas dos columnas para actualizarlas en bloque. Los cambios quedan en "Historial de cambios".

Alcance: solo el Punto de la 92 y su pantalla de venta. No se tocan cantidades, precios, fotos ni ventas.

## Detalle técnico

- Migración: columnas `reference` y `sub_reference` (text, nullables) en `pos_products`; se añaden al trigger `log_pos_product_change()` para que queden auditadas.
- `src/lib/posReferences.ts`: catálogo de referencias/subreferencias y `classifyProduct(name, brand, supplier)` con reglas por palabra clave sobre nombre normalizado (sin tildes, minúsculas), incluyendo detección de mililitros para los termos.
- Backfill con `run_sql` de los 232 productos activos del punto usando la misma clasificación; las filas ya clasificadas a mano nunca se sobrescriben después.
- `PuntoInventario.tsx` y `PuntoVentaPOS.tsx`: estados `selectedReference` / `selectedSubReference` en el mismo patrón que `selectedSupplier`, chips reutilizados en un componente compartido `ReferenceFilterChips`, y la referencia incluida en el texto de búsqueda.
- `PosCatalogBulkUpdate.tsx` y `posCatalogTemplate.ts`: columnas "Referencia" y "Subreferencia" en la plantilla, comparadas en `buildCatalogDiff` y mostradas en la vista previa antes de aplicar.
