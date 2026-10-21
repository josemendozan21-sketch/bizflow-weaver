# Registro y conciliación de pagos de comisiones

## Resultado
Contabilidad podrá registrar transferencias actuales o históricas y aplicarlas a las comisiones que realmente corresponden. El asesor verá los mismos pagos y saldos, sin que una comisión pagada vuelva a quedar disponible.

Este trabajo complementa el panel nuevo: no cambia porcentajes, bonos, requisitos del pedido ni confirmaciones de contraentrega. Pagar parcialmente una comisión al asesor no permite liquidar un pedido que aún no cumple los requisitos.

## Auditoría realizada
- Ya existen liquidaciones, detalle por pedido, pagos y un historial de movimientos; se reutilizarán.
- Los pagos admiten una liquidación vacía, pero la pantalla actual no permite conciliarlos por pedido. El comprobante es opcional y no hay control suficiente de pagos parciales, importes excedidos o transferencias duplicadas.
- La cifra «Pagadas» del panel acumula pagos del asesor sin distinguir adecuadamente período y aplicación; el saldo de cada liquidación solo descuenta sus pagos vinculados.
- La consulta de los datos actuales encontró **dos pagos por $4.900.000**: $2.000.000 con período septiembre y $2.900.000 con período agosto. Ambos carecen de comprobante y de liquidación vinculada. Sus notas dicen «Pago informado por dirección». **No se registrarán otra vez ni se tratarán automáticamente como conciliados**. Se deberán validar asesor, fecha real, período, soporte y destino antes de aplicarlos; las fechas almacenadas no prueban la fecha real de la transferencia.
- Los permisos actuales restringen la escritura a Contabilidad y administradores; se conservará ese control y se reforzará la trazabilidad de cada operación.

## Cambios propuestos

### 1. Registrar pago de comisiones
Una acción en Contabilidad con asesor, importe COP, fecha real, tipo histórico/actual, período, comprobante, referencia bancaria y observaciones. El responsable quedará registrado automáticamente.

El comprobante será obligatorio para confirmar pagos nuevos. Los registros antiguos sin soporte permanecerán identificados como tales hasta su revisión, sin crear soportes ficticios.

### 2. Conciliar el pago
Seleccionar pedidos o liquidaciones y mostrar **Comisión · Ya pagado · Pendiente · Importe a aplicar**. Admitir un pago para varios pedidos y pagos parciales de comisión.

- Ninguna asignación podrá superar el saldo de la comisión ni el importe disponible del pago.
- El remanente sin asignar se mostrará como pendiente de conciliación, sin descontarlo de pedidos arbitrarios.
- Si no se identifican pedidos históricos, permitir una conciliación documentada contra un saldo inicial por asesor y período. Ese saldo no creará ventas ni marcará pedidos antiguos como pagados.
- Bonos y ajustes se mostrarán separados de las comisiones por pedido para no atribuirlos artificialmente a una venta.

### 3. Saldo único para ambos lados
El panel, la liquidación y sus exportaciones mostrarán el mismo saldo: únicamente se descuentan importes confirmados y conciliados, una sola vez. Las comisiones pagadas por completo no se ofrecen de nuevo; las parcialmente pagadas muestran solo el remanente elegible.

### 4. Historial claro para el asesor
Mostrar comisiones generadas, liquidadas, pagos históricos aplicados, pendiente y disponible para nueva liquidación sin añadir otro panel repetido. Incluir historial de transferencias con fecha, importe, período y estado; separar el dinero pendiente de conciliación del ya aplicado.

### 5. Control y correcciones
Solo Contabilidad y administradores autorizados podrán registrar, confirmar, conciliar y corregir. Los asesores consultarán sus propios registros. Cada acción conservará responsable, fecha y motivo. Los pagos confirmados se corregirán mediante anulaciones o reversos auditables, nunca borrándolos sin rastro.

Prevenir el doble registro por comprobante, referencia bancaria e intento repetido; las transferencias parciales legítimas de una misma liquidación seguirán permitidas.

## Detalles técnicos
- Reutilizar `commission_payouts`, `commission_settlements`, sus comprobantes y el historial existente. Agregar solo los estados y registros de asignación/reverso necesarios, sin eliminar estructuras actuales.
- Conservar el detalle de liquidación por pedido como fotografía del cálculo; separar esa inclusión de cuánto se ha pagado para admitir conciliación parcial sin pagar dos veces.
- Centralizar saldos y presentación en la lógica de comisiones existente. Validar asignaciones, identidad del asesor, duplicados y operaciones concurrentes en el servidor, de forma atómica y con auditoría.
- Mantener los permisos y acceso protegido a comprobantes; nuevas estructuras con permisos explícitos y acceso limitado.
- No hacer conciliaciones automáticas de registros antiguos. La aprobación de este plan autoriza desarrollar la funcionalidad, **no asignar ni alterar los dos pagos históricos** sin revisión explícita de Contabilidad.

## Validación
Pruebas concretas: comprobante obligatorio; asignación superior al pago o al saldo rechazada; pago parcial conserva el remanente; pago completo no reaparece; pago sin conciliar no descuenta; pago existente no se duplica; reverso devuelve solo lo aplicado; permisos por rol y asesor.

Verificar en pantalla el registro y conciliación con Contabilidad y la lectura del mismo resultado con el asesor. Si falta autorización para una cuenta, indicar qué verificación queda pendiente.

## Fuera de alcance
No cambiar las reglas de comisión ni conciliar la caja Punto 92, que continúa en espera.

**Hasta aprobar este plan no se ejecutarán cambios en la estructura de datos ni se modificarán saldos históricos.**