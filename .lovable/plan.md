# Plan: logos rotos en Diseño + rediseño compacto de la tabla de comisiones

## 1. Imágenes rotas en "Diseños finalizados"

**Causa raíz (verificada en base de datos):** 265 de los 311 logos ajustados son archivos **PDF**. El componente usa `<img src={adjusted_logo_url}>`, y un `<img>` no puede mostrar PDFs — por eso aparece el ícono de imagen rota. Las URLs y el bucket están bien (la descarga sí funciona).

**Solución:**
- Crear un componente compartido `LogoPreview` (`src/components/diseno/LogoPreview.tsx`):
  - Si la URL termina en `.pdf`: muestra una vista previa embebida con `<iframe>` (o un placeholder con ícono de PDF + botón "Ver PDF" que abre en nueva pestaña).
  - Si es imagen (png/jpg/jpeg/webp): renderiza con `<img>` como hoy.
- Aplicar `LogoPreview` en todas las vistas de diseño que hoy usan `<img>` directo:
  - `DisenosFinalizados.tsx`
  - `AprobacionAsesor.tsx`
  - `TrabajoDisenador.tsx`
  - `EstampacionProductionView.tsx` (si renderiza el logo igual)

## 2. Tabla de comisiones del asesor: eliminar scroll horizontal

Hoy la tabla tiene **14 columnas** (fecha venta, factura, N° pedido, cliente, tipo, valor, flete+cargos, base comisionable, abono, base sin IVA, %, comisión, estado/motivo, acción), lo que obliga a hacer scroll horizontal para llegar a "Solicitar corrección". Además el pill de Estado/motivo muestra textos largos y se desborda.

**Rediseño en `MisComisiones.tsx`:**
- Tabla principal compacta, todo visible sin scroll:
  - Fecha · N° Pedido · Cliente · Valor · Comisión · Estado (badge limpio) · Acción ("Corregir" siempre visible)
- Columnas de detalle (factura, tipo, flete+cargos, base comisionable, abono, base sin IVA, %) se mueven a una **fila expandible** (clic en la fila o en un chevron) con el desglose completo y el motivo de exclusión en texto legible.
- El badge de estado pasa a ser corto y con color semántico:
  - "Comisión total" (verde) · "Parcial (abono)" (azul) · "Pendiente" (ámbar) · "Excluido" (gris) — el motivo detallado va dentro de la fila expandida, no en el pill.
- Los filtros (Todos / Causan comisión / Pendientes / Excluidos / En $0) y la búsqueda se mantienen igual en el encabezado.
- Aplicar el mismo patrón compacto en `CommissionsPanel.tsx` de Contabilidad para que ambas vistas sean consistentes.

## Verificación
- Typecheck + revisión visual con Playwright de la vista de Diseño (logos PDF con preview) y de Mis Comisiones (sin scroll horizontal a 1280px de ancho).
