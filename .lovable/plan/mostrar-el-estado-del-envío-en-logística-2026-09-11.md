# Mostrar el estado del envío en Logística

Jailin no ve si el pedido es contraentrega o si el envío ya está pagado porque la vista de Logística solo muestra el estado de pago del producto: para pedidos al por mayor pinta "Pago completo" o "Saldo", y el aviso de contraentrega existe únicamente para ventas al detal (según el método de pago antiguo). El dato que registra el asesor en el panel de envío del pedido no se está mostrando ahí.

## Qué se va a ver

En cada pedido y en cada grupo de despacho de Logística aparecerá, junto al estado de pago, una etiqueta clara de envío:

```text
Envío contraentrega — cobrar flete al cliente
Envío por cobrar $XX.XXX — cobrar al entregar
Envío ya pagado (incluido en los anticipos)
Envío sin definir
```

- Contraentrega: etiqueta ámbar con el valor a cobrar al cliente.
- Por cobrar: ámbar, con el monto del flete sumado a lo que se cobra.
- Ya pagado / incluido en anticipos: verde, "no cobrar envío".
- Sin definir: etiqueta gris neutra para que Logística sepa que falta que el asesor lo registre.

También aplica a:
- El resumen del grupo de despacho (encabezado de cada envío agrupado).
- La etiqueta de envío que se imprime (rótulo): dirá si hay que cobrar flete y cuánto.
- La descarga en Excel/CSV de despachos: nueva columna con el estado del envío.

## Detalles técnicos

- `src/hooks/useOrders.ts`: reutilizar `SHIPPING_MODE_LABELS` y `getOrderShippingDue`; añadir un helper `getShippingStatusLabel(order)` que devuelva texto + tono (ámbar / verde / neutro) para los cuatro modos (`contraentrega`, `por_cobrar`, `incluido_anticipos`, `pendiente`).
- `src/pages/Logistica.tsx`:
  - `PaymentBadge`: añadir un badge de envío para todos los pedidos (mayor y detal), sin cambiar el badge de pago existente.
  - `GroupPaymentSummary`: en la rama mayorista, agregar la línea de envío; en la rama detal, complementar el cálculo actual usando `shipping_payment_mode` cuando exista, para no duplicar el flete cuando ya está incluido en los anticipos.
  - `ShipmentGroup`: agregar `shippingDue` (suma de `getOrderShippingDue`) y un indicador de si el grupo tiene contraentrega por modo de envío.
  - `generateLabelsForGroups`: incluir la línea de envío en el rótulo impreso.
  - `exportOrdersToCSV`: nueva columna "Estado del envío".
- Sin cambios de base de datos ni de la lógica de saldos o de despacho.

## Verificación

Revisión de tipos y prueba visual en Logística con un pedido de cada caso: contraentrega, envío por cobrar, envío incluido en anticipos y envío sin definir.
