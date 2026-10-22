# Punto 92: descuentos mal calculados en ventas y su efecto en caja

## Qué muestra la evidencia
Las ventas con descuento guardaron un total menor que lo cobrado. Casos confirmados en el sistema:

| Remisión | Fecha | Valor de productos | Descuento guardado | Total guardado | Cobrado (según reporte) |
|---|---|---|---|---|---|
| 78D7159C | 23 jun | $80.000 | $10.000 | $70.000 | $80.000 |
| 8F0CF841 | 29 jun | $152.000 | $25.000 | $127.000 | $152.000 |
| E068EACC | 21 jul | $40.000 | $10.000 | $30.000 | por confirmar |
| 7C8091E7 | 2 sep | $25.000 | $25.000 (50% quedó como 100%) | $0 | por confirmar |

Hay 58 ventas con alguna nota de descuento; 23 tienen descuentos de $1.000 o más (en efectivo, tarjeta y transferencia). Varias quedaron en $0 con un "50%". Las demás son diferencias de centavos por redondeo.

Si el cliente pagó el valor completo en efectivo, la caja recibió más plata de la que registró la plataforma. Esto explicaría parte del sobrante del arqueo del 21 de octubre.

## Primera lectura del arqueo de Eliana (1 ago – 21 oct, 82 días)
- Abre el 1 de agosto con **$489.650**, no con la base de $215.400 que usa la plataforma.
- Los $747.350 son el cierre del 19 y 20 de octubre. El 21 se pagan $568.950 y el cierre real queda en **$178.400**. O sea, los $747.350 eran **antes** de esos pagos, no después.
- Con eso, la diferencia del 21 vuelve a ser la de antes de los pagos (cerca de $162.300), no $731.250.
- Hay una celda rota (#REF!) en el cuadro de balance de las hojas.


## Qué haré (sin cambiar nada hasta que lo apruebes)
1. **Revisar venta por venta:** listar las 58 ventas con productos, % escrito, descuento correcto, descuento guardado, total guardado y diferencia. Marcar las de efectivo, porque son las que afectan la caja.
2. **Encontrar el error:** revisar cómo calcula el descuento la venta del Punto 92 (por ejemplo, si aplica el % sobre otro valor o si aplica el descuento dos veces). Corregirlo para que las ventas nuevas guarden el valor que de verdad se cobró y que la remisión muestre bien el descuento.
3. **Excel para confirmar:** entregar un Excel con columnas para que Eliana o Contabilidad escriban cuánto se cobró de verdad en cada venta.
4. **Corregir lo histórico solo con tu visto bueno:** con lo confirmado, ajustar el total de cada venta, dejando un historial con el valor anterior, el motivo y quién aprobó. No se borra nada.
5. **Cruce día a día con el arqueo de Eliana:** comparar, para cada día de agosto a octubre, apertura, ventas en efectivo, gastos y cierre del Excel contra la plataforma, y marcar el primer día en que no cuadran y por qué (descuento mal guardado, gasto repetido, pago no registrado, etc.).
6. **Recalcular la caja:** proponer como punto de partida el cierre contado de Eliana (por ejemplo $178.400 del 21 de octubre) en lugar de la base de junio, sumando las correcciones aprobadas. Entrego un Excel con el cruce y la propuesta antes de tocar saldos.
7. **Quitar los centavos:** guardar los totales al peso para que dejen de salir diferencias como $0,61.

## Causa confirmada con tus dos ejemplos
El descuento a un solo producto ya existe en la venta, pero hasta el 17 de octubre se restaba dos veces:
- **78D7159C:** Termo a $40.000 (ya con el 20%) + Juguetón $40.000 = **$80.000 cobrados**. El sistema volvió a restar $10.000 y guardó $70.000.
- **8F0CF841:** Termo a $25.000 (ya con el 50%) + Media $57.000 + Free belt $70.000 = **$152.000 cobrados**. Volvió a restar $25.000 y guardó $127.000.

Las ventas nuevas desde la corrección del 17 de octubre restan una sola vez. Como confirmaste que el descuento es por producto, las ventas viejas con el mismo patrón se corrigen al valor de sus productos.

## Descuento por producto en la venta
- Verificar en pantalla que se puede poner el descuento solo al producto que se elija (por % o por valor), que los demás queden a precio normal y que el total, la remisión y la caja muestren lo mismo.
- Mostrar en cada línea el precio normal, el descuento y el precio final, para que se vea a qué producto se aplicó.
- Prueba: Termo $50.000 al 20% + Juguetón $40.000 = $80.000; Termo $50.000 al 50% + $57.000 + $70.000 = $152.000.

## Lo que falta confirmar
- ¿Las ventas que quedaron en $0 con "50%" se cobraron a la mitad? Con la causa confirmada asumiré que sí, salvo que me digas lo contrario.

## Detalles técnicos
- Datos: `pos_sales.discount`, `total_amount`, `notes` ("Descuentos por producto"), y `pos_sale_items.line_total`.
- Las correcciones pasan por el registro de auditoría de ventas (`pos_sale_audit_log`), sin borrar registros.
- Se agregará una prueba de cálculo: un producto de $40.000 con 20% da $8.000 de descuento y total $32.000; 50% sobre $25.000 da $12.500 y nunca $0.
