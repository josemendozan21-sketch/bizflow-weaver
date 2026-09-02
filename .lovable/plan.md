# Auditoría de cálculos y cierre del desfase de comisiones

## Qué encontramos (verificado en datos)

- **Obsequios:** de los 17 pedidos en $0 de Ángela, 16 tienen forma de pago `obsequio` (correctos, no son error). Solo 1 es real: `MW-AM-00359` (Martha Liévano), marcado "pagado" con total $0.
- **Causa principal del desfase:** el período se puede calcular por fecha de venta o por fecha de factura, y hoy no está unificado. Los totales de Ángela cambian de mes según el criterio:

```text
Mes       Por fecha de venta     Por fecha de factura
2026-06        30.545.000              28.466.140
2026-07        41.220.990              46.959.790
2026-08        22.635.287              47.127.183
```

  Hay facturas de meses anteriores cargadas en agosto, por eso el asesor y contabilidad ven cifras distintas.
- **Base inflada:** el total del pedido incluye flete ($8.000–$13.000) y cargos adicionales (marcación, escarcha). Hoy todo eso genera comisión.
- **Riesgo de duplicado:** el grupo 1111 tiene dos líneas idénticas de $320.000 (`MW-AM-01111` / `MW-AM-01112`); hay que confirmar si es un pedido duplicado.
- **Sanos:** abonos vs. pagos registrados cuadran en el 100% de los pedidos de Ángela; valor facturado vs. total también.

## Decisiones aplicadas

1. El período de comisión es **la fecha de factura**, igual para el asesor y para contabilidad. Un pedido sin factura queda como "pendiente de facturar" y no se asigna a ningún mes de liquidación.
2. La **base de comisión excluye flete y cargos adicionales**. Se comisiona sobre producto, sin IVA.

## Qué se va a construir

### 1. Un solo motor de cálculo
- Se elimina el selector de criterio de período: todas las vistas (asesor, contabilidad, exportables) usan fecha de factura.
- Nueva base de comisión = total del pedido − flete − cargos adicionales, luego sin IVA.
- Cada línea muestra el desglose: total, menos flete, menos cargos, base sin IVA, %, comisión.

### 2. Reporte de conciliación asesor ↔ contabilidad
- Vista comparativa del mes con: total vendido, total facturado, total que causa comisión, y la lista de pedidos que se excluyen con su motivo (sin factura, obsequio, sin pago, devuelto, en $0).
- El asesor y contabilidad ven exactamente la misma tabla y el mismo número, para que no haya dos versiones de la verdad.
- Exportable a Excel y CSV desde ambos lados.

### 3. Panel de auditoría de consistencia
Un panel que corre chequeos automáticos y lista lo que no cuadra, con enlace directo al pedido:
- **Pedidos:** total ≠ unidades × precio + cargos; saldo ≠ total − abonos; abono mayor al total; facturado sin fecha de factura; pedidos "pagados" en $0 que no son obsequio.
- **Duplicados:** líneas idénticas en el mismo grupo (mismo cliente, producto, cantidad y valor).
- **Inventario y despachos:** cantidad de producción ≠ cantidad de inventario ≠ cantidad despachada + pendiente por despachar.
- Cada hallazgo tiene severidad y estado (abierto / revisado / ignorado con nota).

### 4. Prevención
- Al facturar se exige fecha de factura.
- Al registrar abono se valida que no supere el saldo pendiente.
- Los obsequios quedan explícitamente marcados y excluidos de comisión sin aparecer como "error".

## Detalles técnicos

- `src/lib/commissions.ts`: fijar `PeriodBasis` en `factura`; nuevo `getCommissionBase(order)` que resta `shipping_cost` y la suma de `order_charges`; los pedidos sin `invoice_date` se clasifican como `pendiente` con motivo "sin factura".
- Los cargos vienen de `order_charges`, que hoy no se carga junto con los pedidos: se agrega un hook que trae los cargos por pedido y alimenta el cálculo.
- `MisComisiones.tsx` y `CommissionsPanel.tsx`: mismo resumen, mismas columnas de desglose, mismos exportables (`commissionExports.ts` se amplía con las nuevas columnas).
- Nuevo `src/lib/consistencyAudit.ts` con los chequeos y `src/components/admin/ConsistencyAuditPanel.tsx` para mostrarlos (visible para admin, contabilidad e inventarios).
- Nueva tabla `audit_findings` (tipo, referencia, severidad, estado, nota, quién revisó) con RLS y grants, para poder marcar hallazgos como revisados.
- Corrección puntual de datos: revisar `MW-AM-00359` y el grupo 1111 antes de tocarlos; no se modifica nada sin confirmar contigo.
