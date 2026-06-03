## Resumen

Habilitar un flujo de **pedidos a crédito** exclusivo para el asesor **Ilian Hernandez**. Sus pedidos se marcan automáticamente como crédito, soportan **múltiples abonos** (con monto, fecha, comprobante y notas), y Logística puede **despacharlos sin pago completo** registrando una fecha límite, generando una **alerta a Contabilidad** para el cobro.

## 1. Nueva tabla de abonos

Tabla `order_payments` para registrar cada pago de un pedido:

- `order_id`, `amount`, `payment_date`, `proof_url`, `notes`, `method`, `recorded_by`, `recorded_by_name`
- Trigger que recalcula `orders.abono` (suma de pagos) y marca `payment_complete` cuando la suma ≥ `total_amount`.
- RLS: el asesor dueño del pedido, admin y contabilidad pueden insertar/ver; logística puede ver.

## 2. Campos nuevos en `orders`

- `is_credit` (boolean) — pedido a crédito.
- `payment_due_date` (date) — fecha límite pactada para terminar de pagar.
- `credit_dispatched_pending_payment` (boolean) — despachado sin pago completo.

## 3. Marca automática para Ilian

Trigger `BEFORE INSERT` en `orders`: si `advisor_id = '<Ilian>'` entonces `is_credit = true`. Configurable por UUID fijo (más adelante se podría escalar a un flag en `profiles`).

## 4. UI — Asesor (Ilian)

En **Mis pedidos** y en el detalle del pedido:

- Badge "Crédito" + fecha de pago pactada (editable).
- Sección **"Abonos"** con lista cronológica: monto · fecha · comprobante · notas · quién lo registró.
- Botón **"Registrar abono"** → diálogo con monto, fecha, archivo (bucket `payment-proofs`), notas.
- Resumen: total · pagado · saldo pendiente.

Para los demás asesores el flujo actual de pago único no cambia.

## 5. UI — Logística

Para pedidos con `is_credit = true`:

- Pueden aparecer en "Listos para despacho" aunque `payment_complete = false`, mostrando badge **"Crédito — saldo $X"** y la fecha pactada.
- En el diálogo de despacho: campo obligatorio **"Fecha de pago pactada"** (pre-llena con `payment_due_date` si existe).
- Al despachar: marca `credit_dispatched_pending_payment = true` y dispara la notificación.

## 6. Alerta a Contabilidad

Trigger en `orders` al pasar a `credit_dispatched_pending_payment = true`:

- Crea `notification` con `target_role = 'contabilidad'`: "Pedido a crédito despachado — {cliente} — saldo $X — vence {fecha}".
- En `AccountingDashboard` agregar panel **"Pedidos a crédito pendientes de cobro"** con: cliente, asesor, saldo, fecha pactada, semáforo (verde/amarillo/rojo según días restantes), enlace al pedido y a sus abonos.

## 7. Detalles técnicos

- **Tabla `order_payments`**: GRANTs explícitos + RLS (asesor dueño / admin / contabilidad / logística-read).
- **Trigger recalculo**: `AFTER INSERT/UPDATE/DELETE ON order_payments` → actualiza `orders.abono` y `payment_complete`.
- **`isOrderFullyPaid` (src/hooks/useOrders.ts)**: sin cambios; al recalcular `abono` y `payment_complete` automáticamente queda consistente.
- **Logística (src/pages/Logistica.tsx)**: ajustar `readyOrders` para incluir pedidos `is_credit && production_status === 'listo'` aunque no estén pagados.
- **`payment-proofs` bucket**: ya existe, se reutiliza.
- **Asesor ID Ilian**: `cdc6ce92-406f-467a-8f27-595c0cbe956a` (hardcoded en el trigger).

## Archivos a crear / tocar

```text
supabase/migrations/<nuevo>.sql         (tabla, triggers, RLS, grants)
src/hooks/useOrderPayments.ts           (CRUD abonos)
src/components/ventas/PaymentsList.tsx  (lista cronológica)
src/components/ventas/AddPaymentDialog.tsx
src/components/ventas/MisPedidos.tsx    (mostrar abonos + badge crédito)
src/pages/Logistica.tsx                 (incluir créditos en "listos")
src/components/logistics/DispatchConfirmDialog.tsx (fecha pago)
src/components/contabilidad/CreditOrdersPanel.tsx (nuevo)
src/components/contabilidad/AccountingDashboard.tsx (montar panel)
```
