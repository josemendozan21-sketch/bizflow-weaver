# Conciliación de caja del Punto de la 92 (corte al 21 de octubre)

Este documento es solo diagnóstico. No se ha cambiado ningún dato, saldo ni cálculo.

## 1. Cifras verificadas
- Arqueo físico: **$747.350**. Es la apertura del 21 de octubre, igual al cierre del 20.
- Saldo en la plataforma: **$585.049,39**.
- Diferencia exacta: **$162.300,61**.
- La plataforma **nunca ha registrado un arqueo**. Su saldo se reconstruye desde la base de $215.400 de junio, sumando y restando cada movimiento. Cualquier error desde junio sigue arrastrándose.

## 2. Hallazgos confirmados con los registros

| Tema | Lo que hay en la plataforma | Efecto en el saldo |
|---|---|---|
| $24.100 "PICKUP TOBERIN" | Retiro de Eliana del 26 sep (aprobado), más gasto de Contabilidad del 25 sep "pickup-toberin" y gasto del 2 oct "Envío a cliente desde Chicó" (los dos pendientes) | Se restan las tres. Si es una sola salida física, se descuentan **$48.200 de más**. Es un error del cálculo: los gastos de Contabilidad se suman a los retiros del punto. |
| Viáticos del 1 oct, $100.000 | Retiro pendiente | Se resta una vez. Es correcto, según lo confirmado por Eliana. |
| Base de $215.400 | Se suma una sola vez, como punto de partida | Es correcta. No se suma dos veces. |
| Centavos | Dos ventas en efectivo con decimales: $200.799,54 (18 jul) y $44.999,85 (17 sep), por descuento porcentual | Explican los **$0,61** (,54 + ,85 = 1,39). Es una diferencia real de $0,39 en el saldo, no solo de presentación. |
| Ventas en efectivo de octubre | 2 oct $67.600 · 5 oct $78.000 (parte en efectivo de una venta mixta de $228.000) · 11 oct $149.900 · 16 oct $60.000 · 17 oct $394.800 | Coinciden con el resumen diario de la plataforma. |
| Pagos del 21 oct en el Excel | Luis Contreras $280.000, Jailene Herrera $278.950, Juan Muñoz $10.000 (total $568.950) | **No están en la plataforma.** Son posteriores al arqueo, así que no explican la diferencia, pero faltan por registrar. Cierre del Excel: $178.400. |

## 3. Explicación numérica hasta donde alcanzan los datos
```text
Diferencia reportada                       162.300,61
- Gasto $24.100 contado de más (x2)        -48.200,00
- Centavos de ventas                            -0,61
= Diferencia sin explicar                  114.100,00
```
Los **$114.100** restantes no se pueden ubicar con la información actual. La captura solo muestra el día 21. Como la plataforma acumula desde junio, hay que comparar día por día los cierres del Excel con el saldo diario de la plataforma. El primer día en que no coincidan señala el movimiento que falta, que sobra o que tiene otro valor.

## 4. Lo que necesito para terminar
- **El Excel original de Eliana**, con los cierres diarios o los movimientos desde junio, o al menos desde la última vez que cuadró.
- La confirmación de que los tres registros de $24.100 son una sola salida física.

Con eso entrego la tabla completa, clasificando cada movimiento como coincidente, valor distinto, duplicado, solo en Excel, solo en la plataforma o pendiente.

## 5. Correcciones propuestas (solo después de aprobar el diagnóstico)
1. **Cálculo:** los gastos de Contabilidad que ya tienen su retiro en el punto dejan de restarse otra vez. Los gastos sin retiro equivalente siguen restando y se muestran como "sin pareja en el punto".
2. **Duplicados confirmados:** se marcan como "anulado por duplicado", con referencia, motivo, quién y cuándo. No se borran.
3. **Centavos:** el saldo se redondea al peso y las ventas nuevas se guardan en pesos enteros.
4. **Registrar el arqueo del 21 de octubre en la plataforma**, para que los cálculos partan de ese conteo y no desde junio. Se registran también los tres pagos del 21.
5. Se mantienen la base de $215.400, la alerta de mínimo de $200.000 y la de máximo de $400.000.

## Detalles técnicos
- `computePosCash` (`src/lib/pettyCash.ts`) suma `petty_cash_expenses` de la sede Chicó además de `pos_cash_withdrawals`; ese es el origen del doble descuento.
- La tabla `petty_cash_counts` está vacía; el saldo arranca en `cash_base`.
- La conciliación de cada movimiento se hará cruzando fecha (±3 días), concepto y valor; nunca solo por valor.
