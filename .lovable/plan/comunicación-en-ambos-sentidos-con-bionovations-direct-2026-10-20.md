# Comunicación en ambos sentidos con Bionovations Direct

Aplica solo a pedidos de "Bionovations Mayorista Web" (los que traen identificador externo). Los pedidos de asesores no cambian.

## 1. Avisos que salen hacia la tienda web
Cada vez que pasa algo en el pedido, la plataforma avisa a la dirección que diste, con la misma clave compartida:

- **Cambio de fase**: cuando el pedido cambia de estado (pendiente, producción de cuerpos, estampación, dosificación, sellado, empaque, listo, despachado, entregado) o cuando cambia el estado del logo en Diseño (pendiente de diseño, en revisión, listo para aprobación, ajustes solicitados, aprobado, finalizado).
- **Para aprobar**: cuando Diseño deja el logo listo para aprobación (con el archivo del diseño), y cuando Estampación sube la foto de tamaño o la de tinta/gel (con la foto).
- **Revisión del saldo**: cuando el asesor aprueba o rechaza un comprobante de saldo, con el motivo si lo rechaza.

Cada aviso lleva un identificador único para que la tienda no lo procese dos veces. Si la tienda no responde, se reintenta automáticamente (hasta 10 veces, con espera creciente) y queda registro del último error.

## 2. Nueva entrada para lo que manda la tienda web
Una dirección protegida con la misma clave. Recibe:

- **Decisiones del cliente** (actor "Cliente web"):
  - Diseño del logo: "aprobado" lo deja aprobado; "ajustes" lo pasa a "ajustes solicitados" con el comentario para Diseño; "nota" solo agrega el comentario.
  - Fotos de estampado (tamaño y tinta/gel): "aprobado" aprueba la foto; "ajustes" la rechaza con el comentario y pide nueva foto, igual que cuando el asesor rechaza; "nota" deja el comentario.
  - Queda en el historial del pedido quién decidió ("Cliente web") y qué comentó, y avisa a Diseño o Estampación.
- **Pagos del saldo**: se registran con método, valor, comprobante y referencia.
  - "por revisar": queda pendiente para que el asesor lo revise; **no** cuenta como pagado todavía.
  - "aprobado": se suma al abono del pedido.
  - Repetir el mismo pago no lo duplica.

## 3. Revisión del saldo por el asesor
En el detalle del pedido aparece una sección "Pagos del saldo por revisar" con el comprobante, y botones **Aprobar** / **Rechazar (con motivo)**. Al aprobar, el valor se suma al abono; en ambos casos se avisa a la tienda web. Pueden revisarlo admin y Contabilidad.

## 4. Bloqueo de despacho
Un pedido de Bionovations Direct no puede pasar a despachado mientras tenga saldo pendiente o algún comprobante "por revisar" o rechazado sin reemplazo. Logística ve el motivo del bloqueo.

## 5. Entrega
Te doy la dirección de la nueva entrada, con ejemplos de cada mensaje, y hago una prueba de punta a punta con un pedido de prueba que borro al terminar.

## Detalles técnicos
- Tabla `external_order_events` (outbox): `event_id uuid`, `external_order_id`, `payload jsonb`, `status`, `attempts`, `next_attempt_at`, `last_error`. Triggers en `orders` (cambio de `production_status`), `logo_requests` (cambio de `status`; `listo_aprobacion` también genera `approval_request` `logo_design` con `adjusted_logo_url`), `production_orders` (`stamp_size_photo_url` / `stamp_inkgel_photo_url` nuevos → `approval_request` `stamp_size` / `stamp_inkgel`; cambio de `current_stage` → `stage`), filtrados por `advisor_id` del asesor web.
- Edge function `dispatch-order-events`: lee el outbox, hace POST a `internal-order-event` con `x-webhook-token = BIONOVATIONS_WEBHOOK_TOKEN`, marca enviado o reprograma con backoff. Disparada por `pg_cron` cada minuto y por `pg_net` al insertar evento.
- Tabla `order_balance_payments`: `order_id`, `external_payment_id` único, `method`, `amount`, `proof_url`, `payment_reference`, `status` (`por_revisar|aprobado|rechazado`), `reason`, `reviewed_by`, `reviewed_at`; RLS para asesor dueño, admin y contabilidad. Al aprobar se inserta en `order_payments` (el trigger existente recalcula `abono`) y se encola `balance_review`.
- Edge function `receive-bionovations-order-event`: valida con zod, aplica decisiones a `logo_requests` / `production_orders` igual que `StampingApprovals` y Diseño, registra en `order_change_log` con `changed_by_name='Cliente web'`.
- `enforce_payment_before_dispatch`: para el asesor web, además exige que no haya pagos `por_revisar`.
- UI: sección de revisión en `OrderDetailDialog` / `MisPedidos`; motivo de bloqueo en Logística.
