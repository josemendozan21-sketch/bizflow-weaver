# Mostrar nombre/email del asesor en Producción

El hook `useProductionOrders` ya enriquece cada orden con `advisor_name` (nombre del perfil o email como fallback). Solo falta mostrarlo en las tarjetas.

## Cambios

**`src/components/production/MagicalWarmersWorkflow.tsx`** (línea ~509)
- En el `CardHeader` del `OrderCard`, debajo de `client_name`, añadir una línea pequeña:
  `Asesor: {order.advisor_name || "—"}` con estilo `text-xs text-muted-foreground`.
- Hacer lo mismo en la tarjeta compacta de "Órdenes completadas" (línea ~380).

**`src/components/production/SweatspotWorkflow.tsx`** (línea ~275)
- Mismo cambio en el `CardHeader` del `OrderCard` y en la sección de completadas (línea ~223).

**`src/components/production/EstampacionProductionView.tsx`** (línea ~214 y ~225)
- Añadir `Asesor` debajo de `client_name` en el header.
- Añadir una fila `<Row label="Asesor" value={order.advisor_name || "—"} />` dentro del bloque de detalles.

No se requieren cambios en backend, hook ni tipos: `advisor_name` ya está disponible en `ProductionOrder`.
