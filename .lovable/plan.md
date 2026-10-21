# Caja del Punto de la 92: diferencia de $162.300,61 con el arqueo del 21 de octubre

## Diagnóstico (con los registros actuales)
- **Arqueo físico:** $747.350. **Plataforma:** $585.049,39. **Diferencia exacta:** $162.300,61.
- **El gasto de $24.100 se cuenta tres veces.** Aparece en dos sitios:
  - Retiro del punto, 26 sep, "PICKUP TOBERIN" (aprobado). Este es el registro real de Eliana.
  - Gasto de caja menor de Contabilidad, 25 sep, "pickup-toberin — Mercancía enviada de Toberín…" (pendiente). Es el mismo envío, digitado otra vez.
  - Gasto de caja menor de Contabilidad, 2 oct, "Envío a cliente desde Chicó" (pendiente). Según Eliana, también es el mismo gasto.
  
  **Causa:** en el ajuste anterior, la cifra del punto empezó a sumar también los gastos de caja menor que carga Contabilidad. Muchos de esos gastos son copias de retiros que el punto ya registró. Mientras valían $24,1 no se notaba; al corregirlos a $24.100, se restaron dos veces. Esto explica **$48.200**.
- **Los centavos (,39 y ,61)** vienen de dos ventas en efectivo guardadas con decimales: $200.799,54 (18 jul) y $44.999,85 (17 sep). Es el mismo problema del descuento por porcentaje que deja centavos.
- **La base de $215.400 sí está bien sumada una sola vez.** Lo que la "baja" es el retiro pendiente del 1 oct, "VIÁTICOS — se saca de base" ($100.000). Si ese efectivo nunca salió o ya volvió, la plataforma lo resta de más.
- **Quedan unos $114.100 sin explicar**, después de quitar el gasto doble y los centavos. Lo más probable es que sean los viáticos de $100.000 más algún otro retiro pendiente o una venta en efectivo sin registrar. Lo confirmaré movimiento por movimiento antes de tocar nada.

## Qué cambia
1. **Cada movimiento resta una sola vez.** El efectivo del punto se calcula solo con lo que registra el punto: base o último arqueo, ventas en efectivo, retiros, consignaciones y pagos a proveedores. Los gastos que Contabilidad cargue para Chicó dejan de restar por su cuenta. Si un gasto de Contabilidad no tiene su retiro en el punto, se mostrará como "sin pareja en el punto" para que lo revisen.
2. **Duplicados anulados, no borrados.** Los dos gastos de Contabilidad de $24.100 se marcan como "anulado por duplicado", con referencia al retiro del 26 de septiembre, el motivo, quién lo hizo y cuándo. Siguen en el historial.
3. **Base fija.** La base de $215.400 se muestra aparte y nunca baja por un gasto. Un retiro marcado "se saca de base" se identifica como tal y se pide a Contabilidad que confirme si se repuso.
4. **Pesos sin centavos.** Los totales de efectivo se redondean al peso. Las ventas nuevas se guardan en pesos enteros. Las dos ventas con centavos se corrigen con registro de corrección.
5. **Cuadre con el arqueo.** Se agrega "Registrar arqueo físico" con el valor contado. La plataforma muestra la diferencia contra el saldo calculado y lo deja como nuevo punto de partida, conservando el historial.
6. **Se mantienen** el mínimo de $200.000, el máximo de $400.000 y sus alertas.

## Antes de aplicar, necesito confirmar con Eliana
- ¿Los viáticos de $100.000 del 1 de octubre salieron de la caja, o se repusieron?
- Si después de eso sigue faltando una diferencia, le paso la lista de días para que la ubique.

## Detalles técnicos
- `computePosCash` (`src/lib/pettyCash.ts`): se excluyen `petty_cash_expenses` del saldo del punto y se agrega un listado de conciliación por monto y fecha (±3 días).
- `petty_cash_expenses`: se agrega estado `anulado_duplicado` y `duplicate_of` (uuid). Se registran en `pos_cash_corrections` o en la bitácora existente.
- `Math.round` en los totales de caja; `parseCOP` y el redondeo al guardar `pos_sales.total_amount`; `correct_cash_amount` para las dos ventas con centavos.
- Arqueo usando la tabla `petty_cash_counts` existente como "último arqueo", que ya sirve de punto de partida en `computePosCash`.
- Pruebas: un gasto y un retiro iguales restan una sola vez; la base no baja con los gastos; el saldo queda en pesos enteros; los límites 200.000/400.000 siguen igual.
