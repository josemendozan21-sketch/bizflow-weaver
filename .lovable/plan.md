# Pago dividido en las ventas del Punto de la 92

## Qué va a ver el vendedor
1. Debajo de "Método de pago" aparece un botón **"Dividir pago"**.
2. Al activarlo, se agregan líneas de pago: cada una con su método (Efectivo, Tarjeta, Nequi, Bancolombia, Davivienda, Link de pago, Transferencia, Otro) y su valor. Se pueden agregar 2, 3 o más líneas y quitar las que sobren.
3. Se muestra en vivo "Total $141.000 · Asignado $100.000 · Falta $41.000". La venta no se puede registrar hasta que la suma sea exactamente igual al total.
4. La confirmación antes de guardar muestra el desglose: "Nequi $80.000 + Efectivo $61.000".
5. El aviso de comprobante con efectivo se mantiene: solo salta si todo el pago es en efectivo.

## Dónde se refleja
- Ventas del día, historial, factura PDF y exportes de contabilidad muestran el desglose por método.
- El cierre de caja suma a cada método solo su parte (el efectivo cuenta solo lo pagado en efectivo).
- Ventas ya registradas no cambian; las que siguen con un solo método funcionan igual.

## Detalles técnicos
- Nueva tabla `pos_sale_payments` (sale_id, method, amount, created_at) con GRANTs, RLS espejo de `pos_sales`, y auditoría al trigger existente.
- `pos_sales.payment_method` guarda "mixto" (o el único método) para compatibilidad; las notas incluyen el texto del desglose.
- `PuntoVentaPOS.tsx`: estado `payments: {method, amount}[]`, validación suma = total; el hook `useCreatePosSale` reemplaza el `split` de dos métodos por un arreglo e inserta las filas.
- Totales por método en `PuntoVentasDelDia.tsx`, `posExports.ts`, `posInvoicePdf.ts` y caja leen de `pos_sale_payments`, con respaldo a `payment_method` para ventas antiguas.
