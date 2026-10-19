# Comisiones: pago solo al 100% y liquidación mensual con confirmación

## Reglas acordadas
- Un pedido está **al 100%** cuando tiene pago total, soporte de pago y despacho.
- La comisión **pertenece al mes en que el pedido quedó al 100%** (la fecha más tardía entre el último pago, el soporte y el despacho). La fecha de venta se conserva aparte.
- Lo causado en un mes **se paga el mes siguiente** (octubre se paga en noviembre).
- Los **bonos** ($10M, $15M, $18M) se calculan sobre lo que quedó al 100% en ese mes.
- Se mantiene la base actual: sin IVA, sin flete ni cargos adicionales, con las tarifas de siempre. No se paga nada parcial ni por abono.
- Un pedido que aún no está al 100% no pertenece a ningún mes: queda en "Pendiente por completar" con el motivo (falta pago, soporte o despacho).

## Qué verán
**Contabilidad → nueva sección "Contabilidad y Asesores"**, con selector de mes y asesor:
- Resumen por asesor: comisiones del mes + pendientes de meses anteriores sin pagar + bono = **total a pagar**, menos lo ya pagado = saldo.
- Detalle de pedidos de cada grupo: pedido, fecha de venta, mes de causación, mes de pago esperado, valor y estado.
- Lista aparte de pedidos "Pendiente por completar", con su motivo.
- Botones: **Aprobar liquidación**, **Devolver a revisión** y **Registrar pago** (valor, fecha, referencia y comprobante). Se permiten pagos parciales y queda visible el saldo.

**Ventas → Comisiones (asesor)**:
- La misma liquidación, solo con sus pedidos.
- Botones **Confirmar que recibí el pago** o **Reportar diferencia** (con nota).
- Historial de meses anteriores con su estado.

## Estados de cada liquidación (por asesor y mes)
Pendiente de liquidación, Pendiente de pago, Pago registrado, En revisión y Saldado (cuando el pago cubre el total y el asesor lo confirmó). Cada acción guarda quién la hizo y cuándo.

## Cierre y trazabilidad
- Al aprobar, se guarda una foto de los pedidos y valores incluidos. Así, cada pedido se paga una sola vez y no vuelve a sumarse en otro mes.
- Una liquidación saldada no se edita. Las correcciones se registran como un ajuste en una liquidación posterior, con nota.
- Se cargan como pagos históricos los ya informados: Ángela $2.000.000 (septiembre) y Pilar $2.900.000 (agosto).

## Unificar pantallas
La tarjeta "Ventas y comisión del mes", el panel de comisiones de Contabilidad y Mis Comisiones usarán este mismo cálculo. Así ya no habrá dos cifras distintas. La leyenda de reglas se actualiza.

## Detalles técnicos
- `src/lib/commissionSettlement.ts` (nuevo): `getCompletionDate(order, payments)`, `causationPeriod`, `expectedPayPeriod = causation + 1`, `buildSettlement(orders, payments, charges, advisorId, payPeriod, alreadySettledOrderIds)`. Reutiliza `getCommissionRate`, `getCommissionableTotal`, `bonusFor` y `getPayability`. Tendrá pruebas con vitest para el 100%, el mes siguiente, los arrastres y que no haya duplicados.
- Tablas nuevas, con permisos para el rol contabilidad, admin y el asesor dueño (lectura, confirmación y reporte):
  - `commission_settlements` (advisor_id, period, status, totals, approved_by/at, returned notes, confirmed_by/at, dispute_note)
  - `commission_settlement_items` (settlement_id, order_id unique, causation_period, base, rate, amount)
  - `commission_payouts` (settlement_id, amount, paid_at, reference, proof_url, registered_by)
  - `commission_settlement_log` (historial de acciones)
- Componentes: `contabilidad/AdvisorSettlementsPanel.tsx`, `ventas/MisLiquidaciones.tsx`; se ajustan `CommissionsPanel`, `MisComisiones`, `MonthAccrualCard` y `CommissionRulesLegend`.
