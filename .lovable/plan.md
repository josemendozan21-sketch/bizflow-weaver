# Filtros de inventario para asesores — de lo macro a lo micro

Rediseño del filtrado en la vista de Inventarios del asesor (Magical y Sweatspot) para que se navegue por facetas jerárquicas en lugar de un buscador de texto plano.

## Cómo se verá y usará

Una sola barra de facetas, idéntica en ambas marcas, que se lee de izquierda a derecha (macro → micro):

```text
[ Buscar... ]                                        12 resultados  [Limpiar]

Sweatspot
Categoría    ( Todos | Termos | Canguros | Accesorios | Chalecos )
Tamaño       ( Todos | 150 ml | 250 ml | 500 ml )
Correa       ( Todas | Con correa | Sin correa )
Logo         ( Todos | Con logo | Marcable / sin logo )
Origen       ( Todos | Nacional | Importado )
Color        ( Todos | Azul | Morado | Negro | Rosado | ... )
Talla        ( Todas | S | M | L | XL )     <- solo cuando aplica (canguros)

Magical Warmers
Sección      ( Cuerpos | Producto terminado )
Familia      ( Todas | Círculo | Corazón | Antifaz | Cervical | Gafas | ... )
Tamaño       ( Todos | 8 cm | 12 cm | Ojo )  <- solo cuando la familia lo tiene
Tipo         ( Todos | ❄️ Frío | 🔥 Térmico )
```

Comportamiento común a las dos marcas:

- Cada opción muestra el número de ítems disponibles con ese valor; las opciones que quedarían en 0 se ocultan (facetas dependientes: al elegir "Termos" solo aparecen tamaños 150/250/500; al elegir "Canguros" aparece Talla y desaparece Tamaño).
- Los filtros seleccionados se muestran como chips removibles con una "X", más un botón "Limpiar todo".
- El buscador de texto sigue existiendo y trabaja combinado con las facetas.
- Resultados agrupados por el primer nivel activo (por ejemplo, por familia en Magical o por categoría/tamaño en Sweatspot), con encabezado de grupo, total de unidades y opción de contraer.
- Toggle "Solo con disponibilidad" para ocultar los ítems en 0, y el orden A-Z / Z-A actual se conserva.
- En móvil las facetas se agrupan dentro de un botón "Filtros" con contador de filtros activos; el resto igual.

## Detalle técnico

- Nuevo `src/lib/inventoryFacets.ts`: derivación de facetas a partir de `stock_items` / `ReferenceItem`.
  - Sweatspot: categoría desde `sweatspot_category`; tamaño (150/250/500 ml) y "correa", "juguetón" y talla (S/M/L/XL) parseados del `name` normalizado; logo desde `logo`; origen desde `product_type` (NACIONAL/IMPORTADO); color desde `color` normalizado a mayúscula/minúscula consistente.
  - Magical: familia = nombre base sin la medida (Círculo, Corazón, Antifaz…); tamaño = "8 cm" / "12 cm" / "Ojo" extraído del nombre; tipo desde `product_type` (Frío/Térmico); sección desde `category`.
  - Funciones puras + pruebas ligeras de parsing con vitest.
- Nuevo `src/components/inventory/FacetFilterBar.tsx`: componente reutilizable que recibe una definición de facetas (`{ key, label, options, dependsOn }`), el estado seleccionado y emite cambios. Renderiza grupos de chips/segmentos con conteos, chips activos y "Limpiar todo". Colapsable en móvil.
- Nuevo `src/components/inventory/GroupedInventoryTable.tsx`: tabla agrupada con encabezados de grupo (nombre, ítems, unidades totales) reutilizada por ambas marcas para que la UI sea idéntica.
- `src/components/inventory/AsesorInventoryView.tsx`: reemplaza `FiltersBar` y las tablas actuales por `FacetFilterBar` + `GroupedInventoryTable`; conserva el switch "Solo SIN LOGO" ahora como faceta "Logo" y mantiene la vista de solo lectura.
- Sin cambios en base de datos ni en permisos: todo se deriva de los datos ya existentes.

## Fuera de alcance

- No se modifica el inventario de Inventarios/Admin (`CategorizedInventoryPanel`) en esta iteración; si el resultado gusta, se puede reutilizar el mismo componente después.
