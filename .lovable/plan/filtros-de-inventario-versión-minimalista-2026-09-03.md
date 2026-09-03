# Filtros de inventario — versión minimalista

Misma funcionalidad (facetas macro → micro, conteos, dependencias, agrupación), pero con una interfaz mucho más limpia: en vez de 60+ chips visibles al tiempo, una sola línea de filtros discretos.

## Cómo se verá

```text
┌───────────────────────────────────────────────────────────────────────┐
│  Buscar producto…                     Categoría ⌄  Tamaño ⌄  Más ⌄    │
│                                                                       │
│  Termos ×   500 ml ×   Con correa ×        6 de 78 · Limpiar          │
└───────────────────────────────────────────────────────────────────────┘

  Termos · 500 ml                                6 refs · 240 unidades
  ─────────────────────────────────────────────────────────────────────
  TERMO 500 AMARILLO CORREA      Amarillo   ·  con logo   ·  Nacional  3
  TERMO 500 AZUL CORREA          Azul       ·  marcable   ·  Nacional  1
```

Cambios concretos frente a la versión actual:

- **Una sola fila de filtros.** Cada faceta es un botón-desplegable (`Categoría ⌄`, `Tamaño ⌄`, `Color ⌄`) que abre una lista buscable con las opciones y su conteo a la derecha. Nada de decenas de botones a la vista.
- **Solo 2–3 facetas principales visibles** por marca (Sweatspot: Categoría y Tamaño; Magical: Familia y Tipo). El resto vive detrás de un único botón **"Más filtros"** con contador de filtros activos.
- **El botón muestra el valor elegido**: en vez de "Categoría ⌄" pasa a decir "Termos ⌄" resaltado, así se ve el estado sin necesidad de chips duplicados. Los chips activos se mantienen solo cuando hay filtros escondidos dentro de "Más filtros".
- **Se elimina el botón "Todos"** de cada faceta: se limpia desde la propia lista ("Todas") o con el chip.
- **Menos ruido en la tabla**: encabezado de grupo en texto sutil con línea divisoria (sin fondo gris fuerte), columnas reducidas — Producto, Atributos (color · logo · origen en una sola celda con texto tenue), Disponible y Estado. El estado pasa a ser un punto de color con el número, no tres badges de colores saturados.
- **Sin bordes ni cajas dobles**: la tabla se apoya en separadores finos; la tarjeta contenedora pierde el borde interno.
- Contador de resultados discreto ("6 de 78") junto a "Limpiar", en vez de barra propia.
- Orden A-Z y "Solo con stock" se mueven a un menú de opciones (ícono de ajustes) para liberar la fila principal.
- En móvil: buscador + un solo botón "Filtros" que abre un panel lateral con todas las facetas.

## Detalle técnico

- Nuevo `src/components/inventory/FacetSelect.tsx`: `Popover` + `Command` (shadcn) que renderiza las opciones de una faceta con búsqueda interna y conteo; el trigger es un `Button variant="outline"` que refleja el valor activo.
- `src/components/inventory/FacetFilterBar.tsx` se reescribe: recibe `primaryKeys` (facetas visibles) y coloca el resto en un `Popover` "Más filtros"; conserva chips activos, "Limpiar" y el contador; el switch de stock y el orden pasan a un `DropdownMenu` de opciones. Sin cambios en la API de datos que ya consume la vista.
- `src/components/inventory/GroupedInventoryTable.tsx`: encabezado de grupo minimalista (texto pequeño en mayúsculas + conteo tenue, borde superior), filas sin bordes pesados, soporte para columnas de tipo "meta" (texto secundario).
- `src/components/inventory/AsesorInventoryView.tsx`: define `primaryKeys` por marca (Sweatspot: `categoria`, `tamano`; Magical: `familia`, `tipo`), y simplifica las columnas a Producto / Atributos / Disponible / Estado (el estado como punto de color con tooltip).
- `src/lib/inventoryFacets.ts` no cambia: la lógica de facetas y dependencias se conserva tal cual, junto con sus pruebas.

## Fuera de alcance

- No cambia la lógica de datos, permisos ni el catálogo; es un rediseño de presentación.
