## Objetivo

Hoy en Inventarios hay dos paneles separados:
- **Solicitudes de inventario** (cuando producción/estampación/asesor pide cuerpos o producto terminado).
- **Movimientos entre áreas** (entregas/retornos manuales).

Cuando un área pide algo, Inventarios tiene que aprobar en uno y luego registrar la entrega en el otro. Vamos a unificar esto: **aprobar una solicitud = entregar a esa área**, y queda registrado automáticamente en el historial de movimientos.

## Cómo va a quedar

### 1. En "Solicitudes de inventario" (pendientes)

Cada fila de pedido pendiente va a tener un botón principal claro:

```
[ Entregar X uds a Producción ]   [ Pasar a Producción ]   [ Rechazar ]
```

- El texto del botón cambia según quién pide (Producción, Estampación, Logística, Asesor, o "Detal" si viene de venta al detal).
- Al darle clic:
  1. La solicitud pasa a estado **aprobada**.
  2. Se descuenta del stock central.
  3. Se crea automáticamente un **movimiento de entrega** al área del solicitante, con:
     - Cantidad e ítem de la solicitud.
     - Motivo: el motivo original de la solicitud (ej: "Pedido al detal de Juan Pérez", "Cliente XYZ — pedido #123").
     - Pedido relacionado si la solicitud venía con `order_id`.
  4. Le llega notificación al área receptora: "Inventarios entregó X uds de Y".

### 2. En "Movimientos entre áreas"

Sigue funcionando igual:
- Mantiene el botón **Registrar movimiento** para entregas/retornos manuales (ej: ferias, retornos de producción).
- El historial ahora muestra **todas** las entregas, incluidas las que vinieron de aprobar solicitudes.
- Filtros existentes (área, tipo, marca, búsqueda) cubren ambas fuentes.

### 3. Retornos desde otras áreas

Cuando producción, estampación o un asesor quieran devolver producto a inventarios:
- Igual que hoy, lo hace Inventarios desde "Registrar movimiento" → tipo Retorno.
- (En una segunda fase podemos dar a esas áreas un botón propio, pero por ahora lo registra Inventarios para mantener control.)

## Lo que NO cambia

- Las áreas siguen pidiendo igual (con el diálogo de "Solicitar a inventario").
- "Pasar a Producción" y "Pasar a Estampación" siguen funcionando como hoy (rutea sin entregar).
- Solicitudes de feria siguen el flujo de Logística.
- Costos y stock se calculan igual.

## Detalle técnico (para tu referencia)

- Se modifica el trigger `process_inventory_request_approval()`: cuando una solicitud pasa a `aprobada`, además de descontar stock, inserta una fila en `inventory_movements` con `direction='entrega'` y `area = requester_area` (mapeando `inventarios`/`admin` → `logistica` por defecto si aplica).
- Para evitar doble notificación, el trigger de `process_inventory_movement` puede saltar la notificación cuando el movimiento se creó por una solicitud (campo `order_id` o un flag opcional). Alternativa: dejar la notificación de "solicitud aprobada" como única y suprimir la del movimiento automático.
- En `InventoryRequestsPanel.tsx`: relabelar el botón "Procesar" cuando la ruta es "logistica" → mostrar "Entregar a {área del solicitante}" para que sea claro que es una entrega directa al área que pidió, no a logística.

## Pregunta antes de implementar

¿Cuando Producción o Estampación piden cuerpos/producto terminado y tú apruebas, quieres que la entrega quede registrada **directamente al área que pidió** (Producción/Estampación), o **siempre a Logística** que es quien lo mueve físicamente?
