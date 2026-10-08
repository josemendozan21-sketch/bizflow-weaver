# Opción "No se envió" en Despachos

## Qué verá Logística
- En cada envío de "Envíos listos para despacho", junto a **Rótulo** y **Despachar**, un botón **No se envió**.
- Al darle clic se abre una ventana para elegir el motivo:
  - El cliente ya no lo quiso
  - Cliente no responde
  - Dirección errada / no se pudo entregar
  - Otro (escribir)
- Un campo de texto obligatorio para explicar el detalle.
- Al confirmar, el envío sale de la lista de despachos y queda como **Cancelado – no se envió**, con el motivo, quién lo marcó y la fecha.

## Qué pasa con el pedido
- No se borra: queda cancelado, así se conserva la historia de pagos y producción.
- El asesor recibe un aviso con el motivo, para que gestione la devolución del dinero si el cliente ya pagó (como Mario Lesmes, que pagó $110.000).
- Si el pedido agrupa varios ítems (ej. SW-VM-01249 y SW-VM-01248), se cancelan todos los del envío.
- El motivo aparece en el historial de cambios del pedido y en "Ver detalles".

## Detalles técnicos
- `Logistica.tsx`: nuevo diálogo `NotShippedDialog`; actualiza `orders.status='cancelado'` y añade motivo en `observations` con prefijo "No se envió:"; inserta notificación al `advisor_id`.
- Filtro de "listos para despacho" excluye `status='cancelado'`.
- Las reservas de inventario se liberan con el trigger existente `release_reservations_on_cancel`; la mercancía física queda para que Inventarios registre su reingreso.
- Sin cambios en la base de datos.
