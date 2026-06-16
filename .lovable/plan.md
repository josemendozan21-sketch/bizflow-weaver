## Objetivo

En la Bandeja de pedidos al por mayor (Inventarios), mostrar en la lista principal "pendientes" únicamente los pedidos recién ingresados. Cualquier pedido que ya esté en una etapa de producción (estampación, producción de cuerpos, dosificación, sellado, recorte, empaque o listo) debe salir de "pendientes".

La tarjeta **"Entregados recientes" se mantiene** tal cual.

## Cambios en `src/components/inventory/WholesaleOrdersInbox.tsx`

1. **Filtrar `pending` (vista mayor)** — además de excluir `deliveredIds`, exigir que `production_status` esté en `["pendiente", "diseno"]`. Pedidos en `estampacion`, `produccion_cuerpos`, `dosificacion`, `sellado`, `recorte`, `empaque` o `listo` dejan de aparecer en la bandeja principal.

2. **Mover esos pedidos a "Entregados recientes"** — cualquier pedido que no esté en `pendiente`/`diseno` y que no esté ya en `deliveredIds` se agrega a `delivered` para que siga visible en la tarjeta inferior.

3. **Aplicar el mismo criterio a `pendingRetail` / `deliveredRetail`** en la vista detal, manteniendo también su tarjeta de "Entregados recientes".

4. **No modificar las consultas a Supabase** — el filtrado se hace en cliente para que, si un pedido vuelve a `pendiente`, reaparezca automáticamente.

## Resultado

La lista "pendientes" muestra solo pedidos nuevos sin etapa iniciada; los que ya pasaron a producción siguen visibles bajo "Entregados recientes".
