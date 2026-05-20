# Calendario de Eventos: colorear entregas por estado

## Objetivo
En el calendario de `/eventos`, las entregas (🚚) hoy se pintan con un color distinto por asesor. Cambiarlo a un esquema de **3 colores fijos por estado** del pedido:

- 🔴 **Rojo** — Estampación o procesos anteriores (`pendiente`, sin iniciar producción aún)
- 🟠 **Naranja** — En producción (`en_produccion`)
- 🟢 **Verde** — Enviado a logística / listo / despachado (`listo`, `entregado`)

## Cambios en `src/pages/Eventos.tsx`

1. **Nuevo mapa de colores por estado** (tokens tailwind, sin tocar el design system):
   ```ts
   const DELIVERY_CALENDAR_COLORS = {
     pendiente:     { bg: "bg-red-100",    text: "text-red-800",    dot: "bg-red-500" },
     en_produccion: { bg: "bg-orange-100", text: "text-orange-800", dot: "bg-orange-500" },
     listo:         { bg: "bg-green-100",  text: "text-green-800",  dot: "bg-green-500" },
     entregado:     { bg: "bg-green-100",  text: "text-green-800",  dot: "bg-green-500" },
   };
   ```

2. **Celdas del calendario** (líneas ~431–442): reemplazar `getAdvisorColor(del.advisorName)` por `DELIVERY_CALENDAR_COLORS[del.status]` para `bg` y `text` del botón de entrega.

3. **Leyenda inferior** (líneas ~451–465): reemplazar la lista de asesores con colores por una leyenda fija de 3 estados:
   - 🔴 Estampación / procesos previos
   - 🟠 En producción
   - 🟢 Listo / Despachado

4. **Vista detalle del día** (línea ~696): el `borderLeftColor` que hoy usa el color del asesor pasa a usar el color del estado de cada entrega.

5. Eliminar (o dejar sin usar) `ADVISOR_COLORS`, `COLOR_PALETTE`, `getAdvisorColor` si ya nadie más los consume en este archivo.

## Fuera de alcance
- No se cambia la lógica de negocio ni `mapProductionStatus`.
- No se tocan los badges de la vista "Entregas" (lista), solo el calendario y su leyenda.
- No se modifican otras páginas ni la base de datos.
