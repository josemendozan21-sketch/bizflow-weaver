# Pedidos contraentrega que siguen "pendientes de facturar"

## Qué pasa (verificado)
- En la app hay **127 pedidos contraentrega ya despachados** (Bogoexpress, Envía, Coordinadora) con saldo de **$10.234.000** marcados como pago incompleto. 124 siguen "pendiente de factura"; ninguno tiene número de factura en la app.
- El archivo de Sandra es la misma exportación de la app: en esos pedidos las columnas "N° Factura" y "Fecha factura" vienen vacías. La factura sí existe, pero se hizo fuera de la app (en el programa contable) y nunca se registró en el pedido.
- Causa 1: la app **no deja adjuntar factura a una venta al detal si no está pagada al 100%** ("Pendiente de pago completo"). En contraentrega el pago llega después del despacho, así que Contabilidad no puede marcarlos como facturados aunque ya facturó.
- Causa 2: el cobro de la transportadora **nunca se confirma en la app**. Existe la confirmación "Recibido y pagado" del contraentrega, pero solo aparece en Comisiones; Logística cruza los cobros por fuera y el pedido sigue con saldo. Solo 3 pedidos tienen la confirmación solicitada y ninguno confirmado.

## Solución propuesta
1. **Facturar contraentrega sin esperar el pago**: en Contabilidad, los pedidos contraentrega despachados se pueden marcar como facturados (con N° de factura, adjunto opcional). Los demás pedidos al detal siguen exigiendo pago completo.
2. **Registrar el número de factura**: al facturar se pide el N° de factura y la fecha, para que salga en la exportación.
3. **Confirmar cobros de la transportadora** (Logística y Contabilidad): nueva vista "Contraentrega por confirmar", filtrable por transportadora y fecha, con selección múltiple para marcar "Cobrado" (guarda el pago, deja el pedido pagado y la comisión se calcula normal) o "No cobrado / devuelto" con motivo.
4. **Poner al día lo existente**: con la lista de facturas y cobros que nos pase Contabilidad/Logística (N° factura y guía o cliente), actualizo los 127 pedidos de una vez. No marco nada como pagado ni facturado sin ese soporte.

## Detalles técnicos
- `getBlockReason` en Contabilidad.tsx: excepción para `payment_method='contra_entrega'` con `production_status` despachado.
- Subir factura guarda también `invoice_number`; acción masiva "Marcar facturado" sin archivo.
- La vista de cobros usa la función existente `confirm_cod_delivery` (pago + `cod_confirmation`), ampliando permisos a logística/contabilidad si hoy no los tiene; versión masiva iterando por pedido.
- Regularización con datos del cliente vía actualización puntual con nota de conciliación.
