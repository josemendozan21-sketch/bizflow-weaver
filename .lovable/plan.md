# Filtros de inventario más limpios (Magical y Sweatspot)

Los filtros actuales muestran todas las opciones de cada faceta como botones, lo que llena la pantalla. Se reemplazan por una fila compacta de menús desplegables.

## Cómo se verá

```text
[ Buscar producto... ]  [Solo con stock ◯]  [A-Z]        78 resultados

[Categoría ▾] [Tamaño ▾] [Correa ▾] [Logo ▾] [Origen ▾] [Color ▾] [Talla ▾]   Limpiar

Chips activos:  Categoría: Termos ✕   Color: Azul ✕
```

- Cada faceta pasa a ser un botón desplegable que muestra el valor elegido (o el nombre de la faceta cuando está en "Todos"). Dentro del menú van las opciones con su conteo y una opción "Todos".
- Los desplegables con muchas opciones (Color, Familia) traen un buscador interno, así desaparece el "+N más".
- Facetas sin opciones válidas no se muestran (igual que hoy).
- Buscador, "Solo con stock", orden A-Z y contador de resultados quedan siempre visibles en la primera línea.
- Los chips de filtros activos con "✕" y "Limpiar todo" se conservan, en una sola línea debajo.
- En móvil: buscador + "Solo con stock" visibles; los desplegables se agrupan en un botón "Filtros" con contador.
- El agrupamiento de resultados y la tabla no cambian.

## Detalle técnico

- `src/components/inventory/FacetFilterBar.tsx`: se reescribe el render de facetas usando `Popover` + `Command` (shadcn) por faceta en lugar de listas de botones; se elimina la lógica de `MAX_VISIBLE`/`showAll`. Misma API de props (`groups`, `selection`, `onSelect`, `onClear`, etc.).
- Sin cambios en `src/lib/inventoryFacets.ts`, `GroupedInventoryTable.tsx` ni `AsesorInventoryView.tsx`, así ambas marcas heredan el mismo comportamiento automáticamente.
- Sin cambios de datos ni de backend.
