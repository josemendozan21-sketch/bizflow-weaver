# Flujo real: la muestra primero, los cuerpos después

Hoy el pedido solo llega a Estampación cuando Inventarios entrega los cuerpos, e Inventarios espera la muestra aprobada. Ese círculo se rompe: el pedido pasa a Estampación apenas lo crea el asesor, y los cuerpos se entregan solo cuando la muestra queda aprobada.

## Flujo nuevo

```text
Asesor crea pedido (con logo o personalización)
        v
Diseño revisa y aprueba el logo (flujo actual, sin cambios)
        v
Aparece de inmediato en Estampación — "Pendiente de muestra"
        v
Estampación prepara y envía la muestra — "Muestra enviada"
        v
Cliente aprueba -> "Muestra aprobada"   |   Cliente rechaza -> "Muestra rechazada" (vuelve a preparar)
        v
Inventarios recibe aviso y se habilita la entrega de cuerpos
        v
Producción continúa normal
```

## Qué se construye

1. **Visibilidad inmediata en Estampación**
   El flujo de Diseño se mantiene tal cual: el logo primero pasa por el diseñador. Lo que cambia es que Estampación ve el pedido apenas Diseño aprueba el logo (o cuando es recompra con logo ya aprobado), sin esperar a que Inventarios entregue cuerpos. Además, en una lista aparte y solo informativa, Estampación ve los pedidos nuevos cuyo logo aún está en Diseño, con los días de espera, para anticiparse; ahí no puede hacer muestra todavía.


2. **Estado de muestra en el pedido**
   Cuatro estados visibles en Ventas, Estampación e Inventarios: Pendiente de muestra, Muestra enviada, Muestra aprobada, Muestra rechazada. Estampación cambia el estado desde la tarjeta del pedido; al enviar puede adjuntar la foto de la muestra y al rechazar se guarda el motivo. Cada cambio queda en el historial con quién y cuándo.

3. **Aviso a Inventarios**
   Al marcar "Muestra aprobada" se envía una notificación a Inventarios y el pedido entra en su bandeja como listo para entregar cuerpos, con contador de pedidos esperando.

4. **Bloqueo de la entrega de cuerpos**
   En la bandeja de Inventarios, los botones de entrega quedan deshabilitados mientras la muestra no esté aprobada, con el mensaje "Esperando aprobación de la muestra". Solo un administrador puede forzar la entrega, dejando registro del motivo.

5. **Pedidos actuales**
   Los pedidos ya en curso (despachados, en producción o entregados) quedan marcados como muestra aprobada para no bloquearlos. Los pedidos pendientes de hoy quedan en "Pendiente de muestra" y aparecen de inmediato en Estampación.

## Detalles técnicos

- Nueva columna `orders.sample_status` (texto con valores `pendiente_muestra`, `muestra_enviada`, `muestra_aprobada`, `muestra_rechazada`), más `sample_photo_url`, `sample_sent_at`, `sample_approved_at`, `sample_reject_reason`. Default `pendiente_muestra` solo cuando el pedido lleva logo/personalización; el resto nace en `muestra_aprobada` para no frenar el flujo actual.
- Backfill: pedidos con `production_status` distinto de `pendiente` → `muestra_aprobada`.
- Trigger `AFTER UPDATE` en `orders` que inserta la notificación a `target_role: 'inventarios'` cuando `sample_status` pasa a `muestra_aprobada` (deduplicada por pedido).
- RLS: escritura de los campos de muestra para `estampacion`, `produccion` y `admin`; lectura para los roles que ya ven el pedido.
- `EstampacionProductionView.tsx`: la pestaña "Por ingresar" pasa a "Muestras" y mantiene el filtro por logo aprobado en Diseño (`logo_requests.status = 'aprobado'` enlazado por `order_id`, más recompras con logo). Se agrega una sección aparte "En diseño" (solo lectura) con los pedidos cuyo logo sigue en revisión, y los controles de cambio de estado de muestra.
- `WholesaleOrdersInbox.tsx`: leer `sample_status`, deshabilitar `openDeliver` cuando no esté aprobada, badge de estado y override para admin.
- Reflejar el estado en `MisPedidos.tsx` (Ventas) y en `OrderQuickView` / `OrderDetailDialog`.
