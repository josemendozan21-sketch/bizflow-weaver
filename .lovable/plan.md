# Comisiones: auditoría, transparencia y reporte mensual

## Qué encontré (verificado en datos reales)

Angela Mendoza tiene un solo usuario asesor (193 pedidos), así que no hay duplicidad de cuentas. Las diferencias vienen de tres causas concretas:

1. **Pedidos con abono parcial quedan fuera del cálculo.** Hoy un pedido solo genera comisión si está marcado como pago completo o ya fue facturado. En agosto 2026, 19 pedidos de Angela por **$16.629.087** quedaron excluidos aunque todos tienen soporte de pago cargado y abono registrado (ej. DERMO ANGEL $3.350.000 con abono $1.680.000, Comfenalco $2.403.800 con abono $1.130.442). Varios ya están despachados o listos. Esto explica el orden de magnitud del millón de pesos reclamado.
2. **El mes al que pertenece la venta cambia solo.** El cálculo usa la fecha de factura cuando existe y, si no, la fecha de creación. En junio 45 de 47 pedidos y en agosto 48 de 82 cambian de mes por esta razón, así que una venta hecha en un mes se liquida en otro sin que el asesor lo vea.
3. **Pedidos sin valor.** 17 pedidos de Angela tienen valor total 0, así que aportan $0 a la comisión y hoy nadie los ve señalados.

## Qué se va a construir

### 1. Regla de causación explícita y consistente
Una sola función decide qué pedido causa comisión y por qué, usada tanto por Ventas (vista del asesor) como por Contabilidad (liquidación). Estados posibles por pedido:
- **Causa comisión total**: pago completo, obsequio o facturado.
- **Causa comisión parcial**: tiene abono y soporte de pago; la comisión se calcula sobre lo efectivamente abonado (proporcional).
- **No causa aún**: sin abono ni soporte, con el motivo escrito.
- **Excluido**: valor 0, devuelto sin pago o anulado, con motivo.

La política de si el parcial se paga proporcional o se difiere al pago total se deja en un solo lugar configurable (por defecto: proporcional al abono, ya que hoy simplemente se pierde).

### 2. Mes de liquidación estable
Se muestra siempre la fecha de venta (creación) y la fecha de factura, y el reporte permite elegir el criterio del período: por fecha de venta o por fecha de factura. Ambas vistas usan el mismo criterio seleccionado, para que asesor y contabilidad nunca vean cifras distintas.

### 3. Reporte mensual del asesor (en Mis Comisiones)
Tabla con una fila por pedido: código, cliente, fecha de venta, fecha de factura, valor total, abono, estado del pedido, estado de pago, base usada para comisión, % aplicado y comisión calculada. Y un resumen del período:
- Ventas totales del mes y número de pedidos.
- Pedidos considerados y su valor.
- Pedidos excluidos, su valor y el motivo agrupado.
- Base sin IVA, comisión calculada, bonos y total a pagar.

### 4. Panel de conciliación en Contabilidad
El mismo detalle por asesor, con la sección "Pedidos excluidos y motivo" visible para que administración pueda revisar caso por caso antes de liquidar. Se conservan las restricciones actuales de visibilidad del módulo (Ilian Hernández y roles sin permiso siguen sin verlo).

### 5. Exportación
Descarga en Excel (.xlsx) y CSV desde ambas vistas, con dos hojas: detalle por pedido y resumen del período, incluyendo la columna de motivo de exclusión.

## Detalles técnicos

- `src/lib/commissions.ts`: reemplazar `isCommissionable` por `classifyOrderForCommission(order)` que devuelve `{ status, base, reason }`; `summarizeAdvisorMonth` y `summarizeAdvisorProgress` pasan a consumirla y a exponer `excludedLines` con motivo. Añadir parámetro `periodBasis: "venta" | "factura"`.
- Corregir el manejo de nulos: hoy `payment_complete` nulo y `payment_proof_url` nulo hacen que el pedido caiga silenciosamente fuera; se normaliza con coalescencia explícita.
- `src/components/ventas/MisComisiones.tsx` y `src/components/contabilidad/CommissionsPanel.tsx`: nuevas tarjetas de resumen, tabla de excluidos y botones de exportación.
- Exportación reutilizando el patrón de `src/lib/accountingExports.ts` (xlsx) más un CSV plano. PDF queda fuera de este alcance.
- Sin cambios de esquema en la base de datos: todo se calcula sobre `orders` y sus abonos ya existentes.

## Fuera de alcance

- Corregir manualmente los 17 pedidos con valor 0 (se reportarán como excluidos con motivo para que el asesor los complete).
- Cambiar los porcentajes de la política 2026 ni la tarifa plana de Valentina Mendoza.
