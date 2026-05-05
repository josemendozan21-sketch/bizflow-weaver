## Objetivo

En la pestaña de logística donde se reciben las solicitudes de feria, dejar más explícito que logística debe ingresar las **unidades reales que despacha** (puede ser distinto a lo solicitado por la feria), y mostrarlo como una columna claramente etiquetada.

## Cambios

**Archivo:** `src/components/logistics/FeriaDispatchTab.tsx`

1. Renombrar la columna `Despacha` → **`Unidades reales enviadas`** (encabezado más ancho y descriptivo).
2. Cambiar el valor por defecto del input: en lugar de prellenar con la cantidad pedida, dejar el campo **vacío** para forzar a logística a digitar el número real que está alistando. Si lo deja vacío al confirmar, se interpreta como 0.
3. Mantener la columna `Pedido` (lo que la feria solicitó) y `Faltante` (diferencia automática), de manera que el comparativo quede claro:
   - Pedido → lo que pidió ventas/feria
   - Unidades reales enviadas → lo que logística realmente alista y despacha
   - Faltante → diferencia (resaltado en rojo si hay menos)
4. Pequeño texto de ayuda arriba de la tabla: *"Indica las unidades que realmente estás enviando para esta feria. Pueden ser menos de las solicitadas si no hay stock suficiente."*

## Notas

- No hay cambios de base de datos: la columna `quantity_dispatched` ya existe en `feria_inventory` y es justo este campo.
- En la vista de la feria (admin/asesor) ya se muestra "Despachado" con el valor confirmado por logística, así que el flujo queda consistente.
