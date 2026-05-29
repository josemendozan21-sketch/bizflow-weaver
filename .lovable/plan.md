## Cambio en `WholesaleOrdersInbox.tsx` (bandeja mayor del rol Inventarios)

Hoy, en cada tarjeta de pedido al por mayor, el badge de stock ya aparece arriba a la derecha ("Stock: N", "Stock parcial: N / X" o "Sin stock"), pero los dos botones — **Entregar a Estampación** y **Producir cuerpos** — siempre aparecen juntos. El usuario quiere que la decisión sea automática según el stock.

### Reglas a implementar (solo afecta los botones de pedidos al por mayor)

1. **Hay stock suficiente** (`stock >= cantidad pedida`):
   - Mostrar **solo** el botón `Entregar a Estampación`.
   - Ocultar `Producir cuerpos`.

2. **No hay stock** (`stock === 0` o no existe referencia en stock):
   - Mostrar **solo** el botón `Producir cuerpos` (esto genera la orden que le llega a Producción, igual que hoy).
   - Ocultar `Entregar a Estampación`.

3. **Stock parcial** (`0 < stock < cantidad`):
   - Mostrar **ambos** botones, para que Inventarios pueda entregar lo que hay a Estampación y a la vez solicitar a Producción los cuerpos faltantes.
   - Mantiene el flujo flexible para casos mixtos.

### Visibilidad del stock

El badge de stock ya es visible en la tarjeta — no hay que añadir nada nuevo, simplemente queda como la única señal que determina qué botón se ve.

### Alcance

- Solo se toca el bloque `kind === "mayor"` dentro de `renderCard` en `src/components/inventory/WholesaleOrdersInbox.tsx`.
- No se cambia la pestaña "al detal" (sigue con su botón único de Logística).
- No se cambia ninguna lógica de backend, notificaciones, ni el diálogo de confirmación.

### Detalles técnicos

```text
enough         => [Entregar a Estampación]
stock === 0    => [Producir cuerpos]
parcial (>0)   => [Entregar a Estampación] [Producir cuerpos]
```

`enough` y `stock` ya están calculados en `renderCard`, así que es solo envolver cada botón en su condición correspondiente.
