# Ventas con descuento del Punto de la 92 se registran por menos de lo cobrado

## Qué está pasando
Cuando la vendedora le pone un descuento a un producto (ej. Termo 50%), la plataforma **descuenta dos veces**:
1. Primero baja el precio del producto (Termo $50.000 → $25.000). Así se guarda en la factura.
2. Después vuelve a restar el mismo descuento ($25.000) al total.

Por eso la pantalla de venta dice $70.000 (lo que de verdad se cobra), pero la factura y las ventas del día dicen $45.000.

Ventas de hoy con este error:
- Dario Rodriguez: cobrado $70.000, registrado $45.000 (faltan $25.000).
- Consumidor final (Juguetón 50%): cobrado $78.500, registrado $58.500 (faltan $20.000).

Hay otro detalle: algunos productos tienen precios con centavos (ej. $44.999,85). Al redondear, la plataforma cree que hubo un "descuento" de $1,52 o $0,23 y pinta esa venta como "Venta con descuento", aunque no se haya dado ninguno. Lleva pasando desde septiembre en muchas ventas.

Además, en la lista de ventas del día el color rosado deja el texto casi invisible.

## Qué voy a corregir
1. **Que el descuento se aplique una sola vez**: el total guardado será igual a lo que muestra "Total a pagar". La factura dirá el precio original, el descuento y el total correcto.
2. **Quitar los descuentos fantasma de centavos**: solo cuenta como descuento lo que la vendedora puso.
3. **Arreglar las 2 ventas de hoy**: pasan a $70.000 y $78.500, para que el cierre de caja de hoy cuadre.
4. **Hacer legible la fila rosada** en la lista de ventas del día.

## Para revisar con ustedes (no lo toco)
Hay 19 ventas más antiguas (junio a septiembre) cuyo total es menor que la suma de los productos. Muchas parecen descuentos de verdad sobre el total o ventas en $0 (obsequios), del sistema anterior. Les paso la lista para que confirmen si alguna está mal.

## Detalles técnicos
- `useCreatePosSale` (`usePuntosVenta.ts`): ya recibe `override_unit_prices` con el precio rebajado y además resta `discount`. Cambio: `total_amount = suma de line_total` cuando hay precios rebajados; `discount` queda solo informativo (precio lista − rebajado). Guardar `unit_price` rebajado como hoy.
- `PuntoVentaPOS.tsx`: `discountedUnitPrice` solo redondea cuando pct > 0; si no, usa el precio tal cual (elimina descuentos de centavos).
- `posInvoicePdf.ts`: subtotal = precio lista (suma de líneas + descuento), luego descuento, luego total = `total_amount`.
- `PuntoVentasDelDia.tsx`: la marca de "venta con descuento" ignora diferencias < $1 y se ajusta el contraste de la fila rosada con tokens del tema.
- Datos: actualizar `total_amount` de `432ef3a2…` a 70000 y `512cbdad…` a 78500 (y `80fac2ec…` discount a 0). Si hay pago dividido, revisar que el desglose sume lo nuevo.
