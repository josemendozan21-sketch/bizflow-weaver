# Gestión del costo de envío en pedidos al por mayor

Objetivo: que el flete deje de manejarse a mano y quede como parte del cálculo financiero del pedido, para Magical Warmers y Sweatspot.

## Dónde aparece

No se pide al crear el pedido. La sección "Envío" aparece en el pedido ya aprobado, dentro del bloque de pagos/abonos del pedido (en Mis Pedidos y en la ficha del pedido), justo antes del despacho. La pueden editar el asesor dueño del pedido, contabilidad y administración.

## Cómo funciona

La sección tiene tres controles:

1. Casilla **Pago contraentrega**. Al marcarla se oculta el valor: el cliente le paga el flete a la transportadora y no suma al saldo.
2. Campo **Valor del envío** (numérico), visible cuando no es contraentrega.
3. Casilla **El envío ya fue incluido en los anticipos**. El valor queda registrado como información, pero no vuelve a sumarse al saldo.

Resultado en el saldo:

```text
Contraentrega            -> saldo = producto pendiente
Envío por cobrar         -> saldo = producto pendiente + envío
Envío ya en los anticipos-> saldo = producto pendiente
```

## Dónde se ve reflejado

- Resumen económico del pedido: línea propia "Envío" separada del valor de los productos, con su estado (contraentrega / por cobrar / incluido en anticipos).
- Ficha de detalle del pedido y buscador rápido: misma línea y estado.
- Confirmación de pago final del asesor: el saldo a cubrir incluye el envío cuando corresponde, y el pedido no queda habilitado para despacho hasta cubrir producto + envío.
- Logística: el valor mostrado a cobrar respeta el mismo criterio, sin duplicar el flete.
- Comisiones: el envío sigue quedando fuera de la base de comisión (regla actual, sin cambios).
- Cada cambio de envío queda en el historial de cambios del pedido.

## Detalles técnicos

Base de datos (`orders`):
- `shipping_payment_mode` (texto, por defecto `pendiente`): valores `contraentrega`, `por_cobrar`, `incluido_anticipos`.
- `shipping_cost` ya existe; se reutiliza como valor del envío.
- `shipping_set_at` / `shipping_set_by_name` para trazabilidad.
- Política de escritura de estos campos para `asesor_comercial` (solo sus pedidos), `contabilidad` y `admin`.
- Backfill: pedidos al detal con método `contra_entrega` -> `contraentrega`; pedidos mayoristas ya pagados con `shipping_cost > 0` -> `incluido_anticipos`; el resto con `shipping_cost > 0` -> `por_cobrar`; los demás quedan `pendiente`.

Frontend:
- `src/hooks/useOrders.ts`: añadir campos al tipo `Order`; nuevas funciones `getOrderShippingDue(order)` y ajuste de `getOrderBalance` para sumar el envío solo en modo `por_cobrar`. `isOrderFullyPaid` pasa a exigir saldo cero incluyendo envío en ese modo.
- Nuevo `src/components/ventas/OrderShippingPanel.tsx` con los dos checkboxes y el valor, más el resumen (producto / envío / saldo).
- Integración en `src/components/ventas/MisPedidos.tsx` (bloque de abonos y diálogo de confirmación de pago final) y en `src/components/common/OrderDetailDialog.tsx` (sección Pagos, reemplazando la línea suelta "Costo de envío").
- `src/pages/Logistica.tsx`: usar el nuevo cálculo en lugar de sumar `shipping_cost` a mano en el badge de contraentrega y en el resumen de grupo.
- `src/lib/commissions.ts`: sin cambio de regla; se verifica que `getShippingCost` siga descontando el flete de la base.

## Verificación

Revisión de tipos, y prueba de los tres escenarios en un pedido mayorista de cada marca: contraentrega, envío por cobrar y envío incluido en anticipos, comprobando saldo, bloqueo de despacho y visualización.
