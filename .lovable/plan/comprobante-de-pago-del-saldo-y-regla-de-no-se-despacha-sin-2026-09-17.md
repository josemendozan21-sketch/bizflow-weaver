# Comprobante de pago del saldo y regla de "no se despacha sin pago"

## Qué pasa con SW-VM-01057

El pedido de Natalia Rodríguez Niño (Sweatspot, $1.160.000, abono $500.000) figura como **despachado**, y en "Mis pedidos" el botón "Subir soporte y confirmar pago" solo aparece mientras el pedido está en estado **listo**. Al quedar como despachado, el bloque de pago desapareció y Valentina se quedó sin forma de adjuntar el comprobante del saldo.

No fue Logística quien lo despachó: en el historial del pedido el estado pasó de "pendiente" directamente a "despachado" el 7 de septiembre, dentro del cierre masivo de pedidos históricos. Lo mismo ocurrió con los otros 4 pedidos que hoy están despachados con saldo: MW-IH-00990, MW-IH-00991, MW-IH-00995 y SW-JM-00421.

La regla sí está aplicada en la pantalla de Logística (un pedido al por mayor solo llega a "listo para despacho" si está pagado completo, salvo los de crédito), pero no existe ninguna barrera en la base de datos, así que un cierre masivo o una corrección de montos posterior puede dejar pedidos despachados con saldo.

## Qué se va a cambiar

1. **Regla firme: sin pago completo no hay despacho** — en Magical y en Sweatspot. Se agrega la validación en la base de datos: un pedido al por mayor no puede marcarse como despachado ni recibir fecha de despacho si tiene saldo pendiente. Única excepción, la que ya existe hoy: los pedidos marcados como crédito, que se despachan con su fecha de pago pactada.
2. **El asesor siempre puede registrar el saldo y su comprobante**: cualquier pedido al por mayor con saldo pendiente muestra el bloque de abonos con "Registrar abono" (monto, fecha, método, comprobante y notas), sin importar la etapa en que esté. Hoy ese bloque solo aparece en pedidos de crédito.
3. **Historial de abonos visible** en ese bloque: fecha, monto y enlace al comprobante de cada abono, y el pedido queda marcado como pagado completo cuando los abonos cubren el total.
4. **Los 5 pedidos despachados con saldo quedan señalados**: se marcan como pendientes de regularizar para que el asesor suba el soporte o Contabilidad ajuste el valor; no se les cambia el estado ni se les tocan los montos.
5. **Se conserva el flujo previo al despacho**: el botón "Subir soporte y confirmar pago" del pedido en estado listo sigue igual, porque es el que autoriza el despacho.

## Detalles técnicos

- Migración: trigger `enforce_payment_before_dispatch()` BEFORE UPDATE en `orders` que lanza excepción cuando `sale_type = 'mayor'`, `is_credit = false`, el nuevo estado es `despachado`/`entregado` o se asigna `dispatched_at`, y `abono < total_amount`. No se aplica a los registros ya despachados (solo a transiciones nuevas) ni a `sale_type = 'menor'`.
- `MisPedidos.tsx`: `CreditPaymentsBlock` deja de filtrarse por `it.is_credit` y se muestra para líneas `sale_type === "mayor"` con saldo pendiente o con abonos registrados; encabezado neutro "Abonos del pedido".
- Dentro de ese bloque se listan los abonos con `useOrderPayments(order.id)` y enlace a `proof_url`; al cubrirse el total se actualiza `payment_complete` (el trigger `recalc_order_payments` ya mantiene `abono`).
- Las políticas del almacén `payment-proofs` no se tocan: `asesor_comercial` ya puede subir y leer.
