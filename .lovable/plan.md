# Claridad del inventario y mejor uso del espacio

Ajustes de UI a partir del video. Sin cambios de datos, permisos ni lógica de negocio.

## 1. Encabezados siempre visibles (sticky)

- La barra de filtros (buscador, facetas, "Con stock") queda fija al hacer scroll, con fondo sólido y una línea inferior sutil.
- La fila de encabezados de la tabla (Referencia · Detalle · Frío/Térmico · ...) queda fija debajo de la barra de filtros, así siempre se sabe a qué corresponde cada número.
- Los encabezados de grupo (familia/categoría) también se mantienen visibles mientras se recorre ese grupo.
- Aplica igual en Magical y en Sweatspot.

## 2. Columna "Estado" más clara (ya no suma ambas variantes)

El problema actual: la última columna suma Frío + Térmico (o Con logo + Marcable) y confunde.

- Se elimina el total mezclado. En su lugar, cada celda de variante muestra su propio estado: la cantidad con un punto de color (disponible / bajo / sin stock).
- Cuando una variante no existe para esa referencia se sigue mostrando "—" (no aplica), diferenciado visualmente de un 0 real.
- La última columna pasa a ser "Total" solo cuando hay una única variante visible (por ejemplo al filtrar por Frío); si hay varias, se muestran únicamente las columnas por variante.
- Los subtotales del encabezado de grupo se mantienen, pero etiquetados explícitamente como "total del grupo".

## 3. "Con stock" como toggle real

- Se reemplaza el botón actual por un switch con etiqueta "Solo con stock".
- Activo: color de acento (fondo/borde primario) para que se vea de inmediato que el filtro está aplicado.
- Se mantiene dentro de la barra sticky, alineado a la derecha junto al orden.

## 4. Uso del espacio consistente entre Inventarios y Ventas

- Las tarjetas de selección (marca, tipo de venta) usan el mismo ancho y grilla en ambas vistas: rejilla de 2 columnas con ancho contenido, no de borde a borde en una y angosta en la otra.
- Los tabs de Inventarios (Cuerpos / Producto Terminado) y los de Ventas usan el mismo tamaño y alineación.
- El indicador de pasos de Ventas (Marca → Tipo de venta → Pedido) se distribuye a lo ancho del contenedor con separadores, en lugar de quedar agrupado a la izquierda.
- Contenedor de página con el mismo ancho máximo en ambas vistas.

## Detalle técnico

- `GroupedInventoryTable.tsx`: `sticky top-...` en `TableHeader` y en las filas de encabezado de grupo, con `z-index` y fondo; el contenedor de scroll pasa a scroll de página para que sticky funcione.
- `FacetFilterBar.tsx`: contenedor sticky con `backdrop-blur`/`bg-background`; `Switch` de shadcn para "Solo con stock"; orden queda visible al lado.
- `AsesorInventoryView.tsx`: las columnas de variante renderizan cantidad + punto de estado; se elimina la columna de estado agregada salvo el caso de variante única; tarjetas de marca a la misma grilla que Ventas.
- `src/pages/Ventas.tsx`: `StepIndicator` distribuido (`justify-between` con conectores) y grilla de `SelectionCard` igual a Inventarios.
- Verificación: TypeScript, los tests de facetas existentes y captura autenticada de `/inventarios` y `/ventas` para revisar sticky y densidad.
