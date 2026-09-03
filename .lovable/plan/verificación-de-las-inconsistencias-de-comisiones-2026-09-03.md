# Verificación de las inconsistencias de comisiones

## Lo que muestran los datos hoy (ya verificado)

Hay **dos fallas distintas**, y se estaban mezclando en una sola historia:

**Falla 1 — el abono inicial no quedaba en el historial de pagos (esta es la que usted recuerda).**
El valor del abono inicial sí quedaba guardado en el pedido, pero **no se creaba el registro en el historial de pagos**. Por eso al abrir el pedido parecía que el cliente nunca había abonado nada. El 2 de septiembre se crearon **710 registros** de "Abono inicial registrado al crear el pedido" para reconstruir ese historial. Esta falla **no afectó las comisiones**, porque el cálculo de comisión lee el abono guardado en el pedido, no el historial.

**Falla 2 — el saldo final nunca quedaba registrado (esta es la que sí movió plata).**
El 3 de septiembre se corrigieron **261 pedidos**. Revisando el registro de cambios uno por uno: **los 261 tenían un abono parcial previo mayor a cero** y lo que faltaba era el saldo. Ejemplos de los tres pedidos que usted reportó:

```text
MW-AM-00938   abono antes 175.000  ->  350.000 (total)
MW-AM-00968   abono antes 276.950  ->  553.900 (total)
MW-AM-00982   abono antes 136.198  ->  504.697 (total)
```

Ninguno de los 261 partía de abono en cero. Es decir: **el PDF no está al revés**, pero sí está incompleto, porque no menciona la Falla 1 y por eso parece contradecir lo que usted vio en pantalla.

## Otras inconsistencias que aparecieron al revisar todo

| Situación | Pedidos | Facturado | Riesgo |
|---|---|---|---|
| Marcados "pago completo" sin ninguna fila en el historial de pagos | 100 | — | Historial incompleto (no afecta comisión) |
| Sin ningún abono registrado | 113 | $18.961.680 | Comisión en $0: si sí cobraron, falta pagarla |
| Abril–mayo despachados sin pago registrado (subconjunto del anterior) | 34 | $3.045.000 | $222.941 de comisión no causada |
| Marcados como obsequio | 208 | $0 | Verificar que realmente sean obsequio |
| Facturados con total en $0 | 5 | $0 | Pedido mal cargado |
| Abono que no cuadra con la suma de sus pagos | 3 | — | Descuadre puntual |

## Qué haré

1. **Auditoría completa de pagos**: un script de verificación que revise los 1.163 pedidos y clasifique cada uno (abono vs. suma de pagos, marca de pago completo, facturado, obsequio, total en $0) y entregue un Excel con cada excepción listada por asesor y mes, para que contabilidad la valide pedido por pedido.
2. **Reemplazar el PDF por una versión v3** que explique correctamente las dos fallas (abono inicial ausente del historial + saldo final no registrado), aclare que solo la segunda genera retroactivo, y conserve el detalle de junio y julio.
3. **Revisar en el código** que ambas rutas ya estén cerradas: que al crear el pedido se cree la fila de pago del abono inicial y que al confirmar el saldo final se registre el pago y se actualice el pedido. Si alguna ruta todavía no lo hace, la corrijo.
4. **Panel de consistencia de pagos**: ampliar el panel que ya existe en Contabilidad para que muestre en vivo estas seis categorías de excepción, y no volvamos a depender de un análisis manual.

No tocaré ningún dato en este paso: primero entrego la auditoría y el PDF corregido para que usted y contabilidad confirmen, y solo después ajusto pedidos si lo aprueban.

## Detalle técnico

- El cálculo oficial vive en `src/lib/commissions.ts` (`classifyOrderForCommission`): un pedido causa comisión total si tiene pago completo o está facturado, parcial y prorrateada si tiene abono, y queda pendiente si no tiene abono. Lee `orders.abono`, no `order_payments`; por eso la Falla 1 no movió comisiones.
- La auditoría comparará, por pedido: `orders.abono` vs. `sum(order_payments.amount)`, `payment_complete`, `invoice_status`, `payment_proof_url` y `delivered_quantity`.
- El PDF v3 se generará como `ajuste_comisiones_contabilidad_v3.pdf` con los mismos números ya validados ($5.140.536 de retroactivo junio–julio) más la explicación corregida.
- El panel se extenderá sobre `src/components/contabilidad/PaymentConsistencyPanel.tsx`.
