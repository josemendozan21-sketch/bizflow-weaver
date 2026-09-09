# Confirmar pagos completos sin cambiar el valor del pedido

## Qué está pasando con los dos pedidos de Andrea

Los dos aparecen en "Pagos inconsistentes" por la misma razón de fondo: hoy no existe ninguna forma de decir "este pedido ya se pagó al 100%". Lo único disponible es la solicitud de **corrección de valor**, que cambia el total del pedido, no los pagos.

- **MW-AM-01031 ($320.000):** figura como pagado y tiene soporte cargado, pero no hay ningún pago ni abono registrado. Angela no lo puede arreglar porque la única acción disponible cambiaría el valor del pedido, que está bien.
- **MW-AM-00938:** Angela usó la corrección de valor con el motivo "YA PAGO TODO EL SALDO". Contabilidad la aprobó y el total subió de $350.000 a $351.000, mientras los pagos registrados siguen en $350.000. Por eso quedó un desfase de $1.000 que no desaparece.

## Qué vamos a hacer

### 1. Nueva acción para el asesor: "Confirmar pago completo"

En sus propios pedidos, el asesor podrá marcar que el cliente ya pagó todo:

- Indica el valor pagado que falta registrar (por defecto el saldo pendiente).
- Adjunta el soporte.
- Escribe una nota corta.

La solicitud llega a Contabilidad igual que las correcciones de valor de hoy. Al aprobarla, el sistema registra el pago faltante en el historial, deja el pedido como pagado y el caso desaparece del panel de inconsistencias. Si Contabilidad la rechaza, queda la razón visible para el asesor.

Esta acción **no** cambia el valor del pedido. El diálogo actual de corrección de valor sigue existiendo, pero con una explicación clara de cuándo usar cada uno.

### 2. Aviso en la corrección de valor

Si el motivo escrito habla de pago ("ya pagó", "saldo", "abono") o el valor propuesto casi no cambia el total, el sistema sugiere usar "Confirmar pago completo" en su lugar, para evitar que se repita lo de MW-AM-00938.

### 3. Limpiar ya los pedidos confirmados por el asesor

Como Angela confirma que estos ya se pagaron al 100% y se despacharon, se corrigen de una vez:

- **MW-AM-01031 (Andrea, $320.000):** registrar el pago completo con el soporte ya cargado.
- **MW-AM-00938 (Andrea):** devolver el total a $350.000 (el valor real, coincide con los dos pagos registrados) y anular el efecto de la corrección aprobada por error. Si el total correcto sí era $351.000, en su lugar se registra el $1.000 faltante — dime cuál prefieres; si no me dices nada, dejo el total en $350.000.
- **MW-AM-00200 y MW-AM-00201 (Diana Lizarazo, $12.500 cada uno):** registrar el pago completo.
- **MW-AM-00212 y MW-AM-00213 (Natalia Amador, $62.000 y $128.000):** registrar el pago completo.

Cada corrección queda con nota de auditoría indicando que fue confirmada por el asesor. Los seis salen del panel y su comisión queda causada.

### 4. Lo que queda en el panel

Solo MW-AM-01095 (DERMO ANGEL), que sí tiene un saldo real pendiente de $1.670.000; se queda hasta que se pague.

## Detalles técnicos

- Se agrega una columna `kind` (`valor` | `pago`) a `order_value_disputes`, con valor por defecto `valor` para lo existente.
- `resolve_order_value_dispute` maneja el nuevo tipo: en lugar de actualizar `total_amount`, inserta una fila en `order_payments` por el monto propuesto, actualiza `abono` y `payment_complete`, y deja registro en el historial.
- El panel de Contabilidad separa las solicitudes de valor de las de pago.
- Corrección de datos por SQL para los dos pedidos de Andrea, con nota de auditoría.
