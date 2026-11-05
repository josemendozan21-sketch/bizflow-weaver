# Pedidos contraentrega que siguen "pendientes de facturar"

## Qué pasa (verificado)
- En la app hay **127 pedidos contraentrega ya despachados** (Bogoexpress, Envía, Coordinadora) con saldo de **$10.234.000** marcados como pago incompleto. 124 siguen "pendiente de factura"; ninguno tiene número de factura en la app.
- El archivo de Sandra es la misma exportación de la app: en esos pedidos las columnas "N° Factura" y "Fecha factura" vienen vacías. La factura sí existe, pero se hizo fuera de la app (en el programa contable) y nunca se registró en el pedido.
- Causa 1: la app **no deja adjuntar factura a una venta al detal si no está pagada al 100%** ("Pendiente de pago completo"). En contraentrega el pago llega después del despacho, así que Contabilidad no puede marcarlos como facturados aunque ya facturó.
- Causa 2: el cobro de la transportadora **nunca se confirma en la app**. Existe la confirmación "Recibido y pagado" del contraentrega, pero solo aparece en Comisiones; Logística cruza los cobros por fuera y el pedido sigue con saldo. Solo 3 pedidos tienen la confirmación solicitada y ninguno confirmado.

## Solución propuesta
1. **Una factura consolidada para muchos pedidos** (el flujo actual de Sandra): en "Por facturar", filtrar por fechas/marca/tipo, seleccionar todos los pedidos que entraron en la factura de consumidor final y pulsar "Asignar factura": se escribe una vez el N° de factura y la fecha, se sube el PDF una vez, y todos los seleccionados quedan facturados con ese mismo número y archivo. Las facturas puntuales de mayoristas siguen funcionando igual, una por pedido.
   - Opcional: desde la misma selección, descargar el archivo plano con exactamente esos pedidos, para que lo que se factura en WO y lo que se marca en la app coincida.
2. **Contraentrega no espera el pago para facturar**: los contraentrega despachados pueden quedar facturados aunque el saldo siga pendiente; el pago se cierra aparte (punto 3). Los demás pedidos al detal siguen exigiendo pago completo.
3. **PRIORIDAD — Contabilidad registra los pagos de contraentrega en bloque**: nueva pestaña "Cobros contraentrega" en Contabilidad con los pedidos despachados y saldo pendiente, filtrable por transportadora (Envía, Bogoexpress, Coordinadora) y fechas. Se seleccionan los pedidos que vienen en la liquidación de la transportadora, se pone la fecha del pago, se sube una vez el soporte (liquidación o extracto) y "Registrar cobro": cada pedido queda pagado al 100%, sale de pendientes y suma a la comisión del asesor. Los que no se cobraron se marcan "No cobrado / devuelto" con motivo. Opción de subir el Excel de la liquidación para seleccionar automáticamente por N° de guía.
   **Relación con la confirmación de los asesores**: sí existe — al despachar un contraentrega se le pide al asesor confirmar en Comisiones "Recibido y pagado" o "No cobrado", con recordatorio a los 7 días. Pero solo se activa para pedidos despachados después de que se creó, por eso 124 de los 127 nunca la pidieron, y ninguno ha sido confirmado. Propuesta: activar la confirmación pendiente en esos pedidos antiguos (le llegan al asesor) y además dejar que Contabilidad/Logística la marquen en grupo desde Contabilidad, porque son quienes cruzan el cobro con la transportadora.
4. **Poner al día lo existente**: con la lista de facturas y cobros que nos pase Contabilidad/Logística (N° factura y guía o cliente), actualizo los 127 pedidos de una vez. No marco nada como pagado ni facturado sin ese soporte.

## Detalles técnicos
- `getBlockReason` en Contabilidad.tsx: excepción para `payment_method='contra_entrega'` con `production_status` despachado.
- Subir factura guarda también `invoice_number`; acción masiva "Marcar facturado" sin archivo.
- La vista de cobros usa la función existente `confirm_cod_delivery` (pago + `cod_confirmation`), ampliando permisos a logística/contabilidad si hoy no los tiene; versión masiva iterando por pedido.
- Regularización con datos del cliente vía actualización puntual con nota de conciliación.
