# Estándar responsive (Bionovations)

Regla base: **ninguna vista puede generar scroll horizontal del viewport**. Si algo es más ancho que la pantalla, el scroll debe ocurrir dentro del componente (tabla, pestañas), nunca en la página.

## Layout
- `DashboardLayout` ya aplica `min-w-0`, `max-w-full` y `overflow-x-clip` en el contenedor y en `main`, con padding `p-4 md:p-6`.
- Todo contenedor flex que envuelva contenido ancho necesita `min-w-0` (sin eso, el hijo empuja el ancho del padre).

## Pestañas (Tabs)
- `TabsList` ya es deslizable en móvil (`overflow-x-auto`, `scrollbar-none`) y `TabsTrigger` lleva `shrink-0`.
- No usar `grid grid-cols-N` fijo: usar `w-full flex md:grid md:grid-cols-N` (o `sm:`/`lg:` según cantidad de pestañas).

## Tablas
- Usar siempre `<Table>` de `@/components/ui/table` (trae contenedor con `overflow-auto`).
- Wrapper externo: `min-w-0 max-w-full overflow-hidden` (nunca `overflow-visible` en móvil).
- Ocultar columnas secundarias en móvil con `hidden sm:table-cell` / `hidden md:table-cell` y mostrar ese dato como subtexto en la primera columna.
- Limitar textos largos: `max-w-[45vw] sm:max-w-none` + `truncate`.

## Filtros y controles
- Nada de anchos fijos: `w-full sm:w-[220px]`.
- Filas de filtros con `flex flex-wrap gap-2`.

## Diálogos
- `DialogContent` con `max-w-[95vw] sm:max-w-lg` y `max-h-[90vh] overflow-y-auto`.

## Verificación
Antes de dar por terminada una vista nueva, comprobar en 390 px, 768 px y 1280 px que
`document.documentElement.scrollWidth === window.innerWidth`.
