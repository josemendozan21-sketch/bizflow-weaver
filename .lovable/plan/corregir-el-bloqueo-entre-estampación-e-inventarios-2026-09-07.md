# Corregir el bloqueo entre Estampación e Inventarios

El flujo se mantiene igual: Diseño trabaja el logo, el asesor/cliente lo aprueba y solo entonces Estampación hace la muestra; con la muestra aprobada, Inventarios entrega los cuerpos. Lo que hay que arreglar es que Estampación no ve el pedido después de la aprobación del logo, así que nadie puede avanzar.

## La falla encontrada

Estampación tiene una lista "Por ingresar" que sí debería mostrar esos pedidos, pero los busca **comparando el nombre del cliente** con el nombre escrito en la solicitud de diseño. Cuando el nombre no coincide exactamente (mayúsculas, apellidos, paréntesis con la empresa, espacios de más), el pedido no aparece y queda invisible hasta que Inventarios lo ingresa.

Hoy hay 27 pedidos aún en "pendiente" con solicitud de diseño enlazada; 20 ya tienen el logo aprobado y deberían estar visibles en Estampación. Varios de ellos tienen nombres como "Kiara Gómez (THE SPA)" o "nancy blanco (BIOIMPLANT)", justo el caso que rompe la comparación por nombre.

## Ajustes

1. **Emparejar por pedido, no por nombre**
   Desde el mes pasado cada solicitud de diseño queda enlazada a su pedido. Estampación pasará a usar ese enlace: si la solicitud del pedido está aprobada (o es recompra con logo ya aprobado), el pedido aparece de inmediato en su lista, sin depender de Inventarios ni de cómo esté escrito el nombre. La comparación por nombre queda solo como respaldo para pedidos viejos sin enlace.

2. **Marcar "Muestra aprobada" y avisar a Inventarios**
   En la tarjeta del pedido, Estampación tendrá el botón "Muestra aprobada" (y "Muestra rechazada", que la devuelve a preparación con el motivo). Al aprobar, Inventarios recibe la notificación y el pedido aparece en su bandeja marcado como listo para entregar cuerpos. El estado se ve también en Ventas.

3. **Inventarios no entrega antes de la muestra**
   En la bandeja de pedidos al por mayor, los botones de entrega quedan deshabilitados con el aviso "Esperando aprobación de la muestra" mientras el pedido no esté aprobado. Solo un administrador puede forzar la entrega, y queda registrado.

4. **Pedidos actuales**
   Los 20 pedidos con logo ya aprobado aparecerán en Estampación apenas se aplique el cambio. Los pedidos ya despachados o en producción quedan marcados como muestra aprobada para no bloquearlos.

## Detalles técnicos

- `EstampacionProductionView.tsx`: reemplazar el filtro `approvedLogoClients` (match por `client_name`) por un cruce con `logo_requests.order_id`, aceptando estados `aprobado` y `finalizado`; conservar el match por nombre como fallback para solicitudes sin `order_id`.
- Nuevas columnas en `orders`: `sample_status` (`pendiente_muestra` | `muestra_enviada` | `muestra_aprobada` | `muestra_rechazada`), `sample_approved_at`, `sample_reject_reason`. Default `muestra_aprobada` para pedidos sin logo/personalización; backfill a `muestra_aprobada` para todo pedido con `production_status` distinto de `pendiente`.
- Trigger `AFTER UPDATE` en `orders` que crea la notificación a `target_role: 'inventarios'` al pasar a `muestra_aprobada`, deduplicada por pedido.
- RLS: actualización de los campos de muestra para `estampacion`, `produccion` y `admin`.
- `WholesaleOrdersInbox.tsx`: leer `sample_status`, badge de estado y bloqueo de `openDeliver` salvo rol admin.
- Reflejar el estado en `MisPedidos.tsx` y en `OrderQuickView` / `OrderDetailDialog`.
