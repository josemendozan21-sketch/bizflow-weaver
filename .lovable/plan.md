# Responsive: eliminar el scroll horizontal y auditar todas las vistas

Objetivo: que ninguna página genere scroll horizontal del viewport y que los menús/pestañas y tablas se lean bien en móvil, sin cambiar funcionalidad ni permisos.

## Qué se corrige

1. **Regla global**: el contenedor principal de la app deja de permitir desbordes horizontales; el scroll horizontal queda confinado a los elementos que sí lo necesitan (tablas anchas), nunca a la página completa. El padding de las páginas pasa a ser menor en móvil.
2. **Pestañas superpuestas (Diseño de Logos y similares)**: hoy usan una rejilla fija (`grid-cols-4`, `grid-cols-5`) que aplasta los textos. Se reemplazan por una barra de pestañas deslizable horizontalmente en móvil y en rejilla desde tablet, con texto legible. Afecta: Diseño de Logos, Estampación, Inventarios (bandeja mayoristas), Inventarios del asesor, Ventas y cualquier otra `TabsList` con rejilla fija.
3. **Inventario del asesor**: la tabla ya no empuja el ancho de la página; el desplazamiento horizontal queda dentro de la tabla y en móvil se reduce el número de columnas visibles (se mantienen Producto, Disponible y Estado; el resto se muestra como subtexto).
4. **Ventas y demás vistas con filtros**: los `Select` con ancho fijo (`w-[280px]`, `w-[240px]`, etc.) pasan a ancho fluido con mínimo, para que se acomoden en una o varias líneas en móvil.
5. **Tablas en general** (Contabilidad, Presupuesto, Comisiones, Disputas, Logística, Ferias, Personal, POS): se estandariza un contenedor con scroll propio, de modo que la página nunca crezca de ancho.

## Auditoría de todas las páginas y roles

Se ejecuta una revisión automatizada con navegador que recorre cada ruta de la app con sesiones de los distintos roles (admin, contabilidad, inventarios, producción, estampación, logística, diseño, asesor) en 390 px, 768 px y 1280 px, y reporta cualquier vista donde el ancho del documento supere el ancho de la ventana, además de textos recortados en menús. Cada hallazgo se corrige y se vuelve a verificar. Se entrega la lista de vistas revisadas y corregidas.

## Para nuevas funcionalidades

Se deja documentado en el proyecto un estándar corto de responsive (contenedores de tabla, pestañas deslizables, anchos fluidos, breakpoints) y se guarda como regla de memoria para que toda vista nueva lo cumpla desde el inicio.

## Detalle técnico

- `src/components/DashboardLayout.tsx`: `main` con `min-w-0 overflow-x-hidden` y `p-4 md:p-6`; contenedor flex con `min-w-0` para evitar el desborde típico de flex + sidebar.
- Nuevo `src/components/ui/scrollable-tabs.tsx` (o clase utilitaria compartida): `TabsList` con `w-full overflow-x-auto flex-nowrap justify-start` en móvil y `md:grid` con las columnas actuales; se aplica en `DisenoLogos.tsx`, `EstampacionProductionView.tsx`, `WholesaleOrdersInbox.tsx`, `AsesorInventoryView.tsx`, `Ventas.tsx`, `Produccion.tsx`, `Contabilidad.tsx`, `Ferias.tsx`, `PuntosVenta.tsx`, `Redes.tsx`.
- Tablas: usar el `containerClassName` ya agregado a `src/components/ui/table.tsx` y envolver en `w-full min-w-0` donde falte; revisar los `overflow-x-auto` existentes para que el ancestro no crezca.
- `src/components/inventory/GroupedInventoryTable.tsx`: columnas con `hidden md:table-cell` para las secundarias y contenido condensado en móvil, conservando el header sticky.
- Anchos fijos `w-[NNNpx]` en filtros → `w-full sm:w-[NNNpx]`.
- Script de auditoría en `/tmp` (no se versiona) con Playwright que mide `document.documentElement.scrollWidth > innerWidth` por ruta y rol.
- Nuevo `docs/responsive-guidelines.md` + regla en memoria del proyecto.

## Fuera de alcance

- Rediseños visuales, cambios de contenido, de lógica de negocio o de permisos.
