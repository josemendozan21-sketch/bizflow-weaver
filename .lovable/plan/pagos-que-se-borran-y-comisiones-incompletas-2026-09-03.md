# Pagos que "se borran" y comisiones incompletas

## Qué encontré (confirmado con datos)

Los tres pedidos (MW-AM-00938, MW-AM-00968, MW-AM-00982) están despachados, tienen el soporte del pago final cargado (`soporte_pago_final`), pero en la base quedaron como **no pagados**, con el abono igual solo al pago inicial (50% en dos de ellos, 27% en el otro).

Causa raíz, en dos partes:

1. Cuando el asesor usa "Subir soporte y confirmar pago", el sistema marca el pedido como pagado **pero no registra el pago del saldo** como movimiento. Queda solo la bandera, sin la plata.
2. Existe una regla automática que, cada vez que se toca la tabla de pagos de un pedido, **recalcula el abono y vuelve a decidir si está pagado** comparando la suma de pagos contra el total. El 2026-09-02 se migraron 710 "abonos iniciales" a esa tabla; al insertarlos, la regla recalculó y dejó en "no pagado" a todos los pedidos que solo tenían el abono inicial registrado, borrando la confirmación previa del saldo.

Alcance real hoy:
- 261 pedidos tienen soporte de pago final cargado y aun así figuran como no pagados.
- 317 pedidos tienen únicamente el abono inicial migrado y suma menor al total (262 de ellos ya despachados).
- Efecto en comisiones: esos pedidos solo causan comisión proporcional al abono, no al 100%.

## Qué se va a hacer

### 1. Que confirmar el pago sí registre la plata
Al confirmar el pago completo, además de marcar el pedido como pagado, se registrará automáticamente el pago del saldo pendiente (monto, fecha, soporte y usuario). Así el abono coincide siempre con lo realmente pagado y queda trazabilidad.

### 2. Que el recálculo no borre confirmaciones manuales
La regla automática dejará de "desmarcar" un pedido pagado. Solo marcará pagado cuando los pagos cubran el total; nunca revertirá un pedido ya confirmado como pagado a mano por asesoría o contabilidad.

### 3. Corregir los pedidos históricos
Para los pedidos que tienen soporte de pago final cargado y quedaron como no pagados (261 casos, incluidos los tres reportados):
- Se registra el pago del saldo faltante con nota de corrección automática y fecha del despacho/soporte.
- El pedido queda como pagado y su abono igual al total.
- Queda registrado en el historial para que contabilidad pueda auditarlo.

Los pedidos que realmente están a medio pagar (sin soporte final) **no** se tocan: siguen como parciales y aparecen en Conciliación.

### 4. Panel de control para que no vuelva a pasar
En Contabilidad > Conciliación se añade una revisión "Pagos inconsistentes" que lista automáticamente:
- Pedidos despachados/entregados sin pago completo.
- Pedidos marcados como pagados cuya suma de pagos no llega al total.
- Pedidos con soporte de pago final pero sin registro de pago.

Cada fila muestra el desfase en pesos y la comisión que se está dejando de causar, con acción para corregir.

### 5. Verificación del cálculo de comisiones
Después de la corrección se recalcula y compara, mes a mes y por asesor, el total causado antes y después, para confirmar que el desfase reportado desaparece. Se entrega el resumen en el chat.

## Detalles técnicos

- Migración: ajustar `recalc_order_payments()` para que `payment_complete` solo pase a `true` (nunca de `true` a `false`), y respetar la confirmación manual.
- `PaymentConfirmDialog` en `src/components/ventas/MisPedidos.tsx`: insertar en `order_payments` el saldo (`getOrderBalance`) con `proof_url`, `recorded_by`, `recorded_by_name` antes/junto a la actualización del pedido; reutilizar `useCreateOrderPayment`.
- `PendingProofPanel.tsx`: mismo tratamiento en la confirmación masiva.
- Backfill vía consulta de datos sobre los pedidos con `payment_proof_url like '%soporte_pago_final%'` y `payment_complete = false`.
- Nueva sección en `src/components/contabilidad/DisputesPanel.tsx` (Conciliación) con las tres detecciones, usando `isOrderFullyPaid`/`getOrderBalance` de `useOrders.ts` y `classifyOrderForCommission` de `src/lib/commissions.ts`.
- Sin cambios en la política de comisiones ni en reservas, producción o despachos.
