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

## Qué haré (sin cambiar nada hasta que lo apruebes)
1. **Revisar venta por venta:** listar las 58 ventas con productos, % escrito, descuento correcto, descuento guardado, total guardado y diferencia. Marcar las de efectivo, porque son las que afectan la caja.
2. **Encontrar el error:** revisar cómo calcula el descuento la venta del Punto 92 (por ejemplo, si aplica el % sobre otro valor o si aplica el descuento dos veces). Corregirlo para que las ventas nuevas guarden el valor que de verdad se cobró y que la remisión muestre bien el descuento.
3. **Excel para confirmar:** entregar un Excel con columnas para que Eliana o Contabilidad escriban cuánto se cobró de verdad en cada venta.
4. **Corregir lo histórico solo con tu visto bueno:** con lo confirmado, ajustar el total de cada venta, dejando un historial con el valor anterior, el motivo y quién aprobó. No se borra nada.
5. **Recalcular la caja:** sumar al saldo de caja la diferencia de las ventas en efectivo ya corregidas, y actualizar la conciliación del 21 de octubre para ver cuánto del sobrante queda explicado.
6. **Quitar los centavos:** guardar los totales al peso para que dejen de salir diferencias como $0,61.

## Lo que necesito confirmar
- En 78D7159C y 8F0CF841: ¿se cobró el valor completo, sin descuento, o se aplicó un descuento menor?
- ¿Las ventas que quedaron en $0 con "50%" se cobraron a la mitad?

## Detalles técnicos
- Datos: `pos_sales.discount`, `total_amount`, `notes` ("Descuentos por producto"), y `pos_sale_items.line_total`.
- Las correcciones pasan por el registro de auditoría de ventas (`pos_sale_audit_log`), sin borrar registros.
- Se agregará una prueba de cálculo: un producto de $40.000 con 20% da $8.000 de descuento y total $32.000; 50% sobre $25.000 da $12.500 y nunca $0.
