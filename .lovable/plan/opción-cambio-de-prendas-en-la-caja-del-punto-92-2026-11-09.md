# Opción "Cambio de prendas" en la caja del Punto 92

## Cómo funciona hoy
En "Ventas del día" se puede editar una venta, pero solo los datos del cliente, el medio de pago y la nota. Para cambiar productos hay que eliminar la venta y registrarla otra vez. Así se pierde el rastro de la venta original y se pueden duplicar cobros (es lo que pasó con el cambio de Tomas Mejías, que toco corregir a mano).

## Qué se agrega
Un botón **"Cambio"** en cada venta registrada (del día y de días anteriores):

1. Se abre la venta original con sus productos. El vendedor marca qué prendas devuelve el cliente y cuántas.
2. Agrega las prendas nuevas que se lleva, con el mismo buscador de la caja.
3. La app calcula la diferencia:
   - **El cliente paga más:** se cobra solo la diferencia y se elige el medio de pago (efectivo, tarjeta, etc.).
   - **Mismo valor:** no entra dinero.
   - **Sobra a favor del cliente:** se pide escoger entre devolver el dinero (sale de caja) o dejarlo como saldo a favor con una nota.
4. Inventario: las prendas devueltas vuelven al stock del punto y las nuevas se descuentan.
5. Se genera la **factura del cambio**. Muestra lo devuelto, lo nuevo, la diferencia y el número de la venta original. La venta original no se borra: queda marcada "con cambio" y enlazada.
6. En caja y en el cierre diario solo cuenta la diferencia que realmente entró o salió, así no se duplican ingresos.
7. Contabilidad ve los cambios en el reporte de ventas, con la nota y la venta original.

## Por confirmar con el punto
- ¿Hay un plazo máximo para hacer cambios (por ejemplo 30 días)?
- Si sobra dinero a favor, ¿lo devuelven en efectivo o siempre queda como saldo para otra compra?
- ¿Cualquier vendedor puede hacer cambios, o solo el encargado del punto?

## Detalles técnicos
- Nueva tabla `pos_sale_exchanges` (venta original, venta de cambio, diferencia, tipo de saldo, autor, nota). Grants y RLS iguales a `pos_sales`, con `is_pos_for_location`.
- El cambio se registra como una nueva `pos_sales`, con ítems negativos para lo devuelto y positivos para lo nuevo, y su total es la diferencia. Así la caja, el cierre diario y los reportes existentes cuadran sin lógica aparte.
- Una función atómica `register_pos_exchange` crea la venta, los ítems, los movimientos de inventario (entrada/salida) y el enlace. Valida que no se devuelva más de lo vendido, contando cambios anteriores.
- `posInvoicePdf.ts`: variante "Factura de cambio". `PuntoVentasDelDia.tsx`: botón y diálogo de cambio, más una etiqueta "Con cambio" en la venta original.
- Prueba: la diferencia, el bloqueo por devolver más de lo vendido y el efecto neto en el inventario.
