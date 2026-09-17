# Subir el comprobante de pago después de despachado

## Qué pasa con SW-VM-01057

El pedido de Natalia Rodríguez Niño está en estado **despachado**, con abono de $500.000 sobre un total de $1.160.000.

En "Mis pedidos", el botón "Subir soporte y confirmar pago" solo aparece cuando el pedido está en estado **listo**. Apenas Logística lo despacha, el bloque de pago desaparece de la tarjeta y el asesor se queda sin ninguna forma de adjuntar el comprobante del saldo.

El bloque de abonos con "Registrar abono" (que sí permite adjuntar comprobante en cualquier momento) hoy solo se muestra en pedidos marcados como **crédito**, y este no lo está.

Hay 5 pedidos al por mayor en esa misma situación: despachados o entregados, con saldo pendiente y sin manera de subir el soporte.

## Qué se va a cambiar

1. **Bloque de pagos siempre disponible mientras haya saldo**: cualquier pedido al por mayor con saldo pendiente muestra el bloque de abonos con "Registrar abono" (monto, fecha, método, comprobante y notas), sin importar si está en producción, listo, despachado o entregado. Ya no depende de que esté marcado como crédito.
2. **El pedido deja de mostrar saldo al completarse**: al registrar el abono que cubre el saldo, el pedido queda marcado como pagado completo y el bloque pasa a mostrar "Pago completo" con el historial de abonos y sus comprobantes.
3. **Historial visible**: dentro del bloque se listan los abonos ya registrados con fecha, monto y enlace al comprobante, para que el asesor y Contabilidad vean qué se subió.
4. **Se conserva el flujo actual antes del despacho**: el botón "Subir soporte y confirmar pago" del pedido en estado listo sigue igual, porque ese es el que autoriza el despacho.

No se modifica ningún pedido existente ni sus montos: solo se habilita la pantalla para que puedan adjuntar lo que falta.

## Detalles técnicos

- `MisPedidos.tsx`: el render de `CreditPaymentsBlock` deja de filtrarse por `it.is_credit` y pasa a mostrarse para las líneas `sale_type === "mayor"` con saldo pendiente (`!isOrderFullyPaid(it)`) o con abonos ya registrados; se renombra el encabezado a "Abonos del pedido" y se ajusta el estilo para que no lea como bloque exclusivo de crédito.
- En `CreditPaymentsBlock` se agrega la lista de abonos leyendo `useOrderPayments(order.id)` con enlace a `proof_url`, y se marca `payment_complete = true` en `orders` cuando los abonos cubren el total (el trigger `recalc_order_payments` ya actualiza `abono`).
- No se tocan las políticas del almacén `payment-proofs`: el rol `asesor_comercial` ya tiene permiso de carga y lectura.
