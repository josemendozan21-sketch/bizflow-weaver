# Ventas del Punto de la 92 que quedan en efectivo sin serlo

## Qué encontramos

En la pantalla de venta del punto, el campo "Método de pago" viene preseleccionado en **Efectivo** y está al final del formulario, después de cliente, cédula, email, teléfono, ciudad y dirección. Si la persona no baja a cambiarlo, la venta se guarda en efectivo sin ningún aviso, aunque adjunte el comprobante del datáfono.

Además, al terminar una venta se limpian el carrito y los datos del cliente, pero el método de pago **no se reinicia**: queda el de la venta anterior. Así, el valor mostrado no siempre corresponde a lo que la persona eligió conscientemente en esa venta.

Hoy el punto tiene 441 ventas en tarjeta y 44 en efectivo: el efectivo es la excepción, pero es lo que el sistema propone por defecto.

Tampoco queda registro de quién corrigió una venta ni cuándo, así que correcciones como las de hoy no son auditables.

## Qué se va a cambiar

1. **Sin método de pago por defecto**: el campo arranca vacío ("Selecciona el método de pago") y el botón de registrar venta no se habilita hasta elegirlo. Se acaba el guardado silencioso en efectivo.
2. **Se reinicia después de cada venta**: terminada una venta, el método vuelve a quedar sin seleccionar, igual que el carrito.
3. **Método visible al confirmar**: antes de guardar aparece una confirmación corta con el total y el método elegido en grande ("$141.000 · Tarjeta"), para detectar el error antes de que quede registrado.
4. **Aviso de incoherencia**: si se adjunta soporte de pago (datáfono, Nequi, Bold) y el método elegido es efectivo, el sistema pregunta "¿Seguro que fue en efectivo? Adjuntaste un comprobante" antes de continuar.
5. **Historial de cambios de ventas**: toda edición de una venta del punto (método de pago, cliente, notas) queda guardada con quién, cuándo, valor anterior y nuevo, y se consulta en una pestaña de historial como en los otros módulos.

No se tocan ventas ya registradas, ni inventario, ni cierres de caja. Las 6 facturas ya corregidas quedan como están.

## Detalles técnicos

- `PuntoVentaPOS.tsx`: `paymentMethod` pasa de `useState("efectivo")` a `useState("")`; `SelectValue` con placeholder; el botón de confirmar se deshabilita si `!paymentMethod`; en el reset posterior a la venta se agrega `setPaymentMethod("")`; diálogo de confirmación con total y método antes de `sale.mutateAsync`, y advertencia extra cuando `proofFile && paymentMethod === "efectivo"`.
- Migración: tabla `pos_sale_audit_log` (sale_id, location_id, field, old_value, new_value, changed_by, changed_by_email, created_at) con GRANTs y RLS, más trigger `log_pos_sale_change()` SECURITY DEFINER sobre `pos_sales` que audita `payment_method`, `total_amount`, `client_name` y `notes`.
- Panel de historial reutilizando `ChangeLogPanel` (como `PosProductChangeLogPanel`), montado en la pestaña de ventas del punto en `PuntosVenta.tsx`.
