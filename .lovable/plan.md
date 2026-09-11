# El envío contraentrega de Pilar no quedó guardado

## Qué encontré

En el pedido MW-PB-01097 (Nancy Blanco – DENTSAN) el sistema tiene el envío como "sin definir" y valor 0. En el historial del pedido solo aparece el cambio de abono que hizo Pilar hoy a las 14:25; nunca entró un cambio de envío. Lo mismo pasa con MW-PB-01098 (BIOIMPLANT), el pedido gemelo.

Causa: en el bloque de envío el asesor marca la casilla "Pago contraentrega", pero el cambio solo se guarda si además oprime el botón "Guardar envío". Si confirma el pago o cierra la vista antes, la marca se pierde sin ningún aviso. Los permisos están bien; no fue un bloqueo del sistema.

## Qué se va a hacer

1. Corregir los dos pedidos: dejarlos como envío contraentrega, con registro de quién lo ajustó.
2. Que la casilla se guarde sola al marcarla (sin depender del botón), con aviso de confirmación.
3. Mientras haya un cambio sin guardar, mostrar un aviso claro "cambios sin guardar" en el bloque de envío.
4. Antes de confirmar el pago final, si el envío sigue "sin definir", pedirle al asesor que lo defina (contraentrega, por cobrar o ya incluido en los anticipos). Así Logística nunca recibe un pedido sin esa información.
5. Registrar los cambios de envío en el historial del pedido, para poder auditarlos como se audita el abono.

## Detalles técnicos

- `src/components/ventas/OrderShippingPanel.tsx`: guardar al cambiar (`onCheckedChange` dispara el guardado; el valor numérico se guarda con debounce/blur), indicador de estado sin guardar, mantener el botón como respaldo.
- `src/components/ventas/MisPedidos.tsx` (`PaymentConfirmDialog`): bloquear "Confirmar pago y autorizar despacho" cuando `shipping_payment_mode` sea `pendiente`, con selector rápido de modo dentro del diálogo.
- Migración: extender el trigger `log_order_change` para registrar `shipping_payment_mode` y `shipping_cost` en `order_change_log`.
- Datos: actualizar MW-PB-01097 y MW-PB-01098 a `shipping_payment_mode = 'contraentrega'`, `shipping_cost = 0`, con `shipping_set_by_name` indicando el ajuste.

## Verificación

Consulta de los dos pedidos tras la corrección, revisión de tipos y prueba del flujo: marcar contraentrega, recargar y confirmar que persiste; intentar confirmar pago con envío sin definir y ver el bloqueo.
