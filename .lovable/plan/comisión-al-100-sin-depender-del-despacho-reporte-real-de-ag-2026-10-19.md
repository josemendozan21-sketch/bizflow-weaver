# Comisión al 100% sin depender del despacho + reporte real de agosto y septiembre

## Regla nueva
- Un pedido queda **al 100%** cuando tiene **pago total y comprobante de pago**. El despacho ya no se exige.
- La comisión cuenta en el mes en que el cliente terminó de pagar (fecha del último pago) y se paga el mes siguiente. No cambia nada más: sin IVA, sin flete ni cargos, mismas tarifas, y bonos sobre lo pagado al 100% en el mes.
- **Pedidos de la corrección del 3 de septiembre:** su saldo quedó con esa fecha y no se sabe cuándo se pagó de verdad. Para ubicarlos en un mes se usa, en este orden, la fecha de despacho, luego la de factura y por último la de venta. Nunca se usa el 3 de septiembre. En el reporte quedan marcados.

## Ajustes en la plataforma
- **Contabilidad y Asesores, y Ventas → Comisiones:** "Pendiente por completar" ya no mostrará "falta despacho". La columna "Al 100%" pasa a ser la fecha de pago completo.
- **Leyenda de reglas y tarjeta "Ventas y comisión del mes":** se actualiza el texto y la comisión retenida deja de exigir despacho.
- Se actualizan la regla guardada y las pruebas automáticas: se agrega una prueba de "pagado con comprobante y sin despacho = se liquida", y se cambia la prueba que exigía despacho.

## Reporte (Excel)
`comisiones_reales_agosto_septiembre.xlsx`, con el mismo cálculo de la plataforma. Octubre no se incluye.
- **Resumen:** una fila por asesor y mes (agosto se paga en septiembre; septiembre se paga en octubre) con:
  - número de pedidos y ventas pagadas al 100%;
  - comisión, bono y total;
  - pagado informado (Ángela $2.000.000 de septiembre, Pilar $2.900.000 de agosto) y saldo.
- **Detalle de pedidos:** pedido, cliente, fecha de venta, fecha de pago completo (o "corrección 3-sep" con el mes usado), valor, base sin IVA, % y comisión.
- Todo con fórmulas, revisado sin errores.

## Detalles técnicos
- `commissionAccrual.getPayability`: se quita el requisito `dispatched_at`. Afecta también lo retenido en `summarizeMonthAccrual`.
- `commissionSettlement.getCompletionDate`: devuelve el máximo de los pagos reales. Si hay una fila de la corrección, usa `dispatched_at`, luego `invoice_date` y luego la fecha de venta. Si no hay pagos registrados, también usa ese orden.
- Se actualizan `CommissionRulesLegend`, el texto de `SettlementsView`, `mem://features/commission-settlement-rules` y la línea de `AGENTS.md`.
- El reporte se genera con un script temporal que importa `buildSettlement` (sin duplicar la lógica) y luego con openpyxl, y se recalcula con LibreOffice.
