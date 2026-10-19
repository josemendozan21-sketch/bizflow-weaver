# Caja del Punto de la 92: una sola cifra, límites con alertas y corrección de valores mal digitados

## Lo que está pasando hoy
- **Dos cifras distintas.** Eliana ve **$652.651**: la base de $215.400, más las ventas en efectivo, menos los retiros, las consignaciones y los gastos. Contabilidad, en Caja menor → Chicó, ve **-$48**, porque esa tarjeta solo suma los movimientos de caja menor cargados por Contabilidad y no tiene en cuenta las ventas ni los retiros del punto. La cifra correcta es la de Eliana.
- **La base de $215.400 sí se suma al disponible.** Es el efectivo con el que abrió la caja; no es un valor adicional.
- **Los $48 son un error de digitación.** Dos gastos de envío se escribieron como "24.100" y la plataforma los guardó como $24,1, porque leyó el punto como decimal. Pasa en todos los campos de valor del punto: retiros, consignaciones, gastos y arqueo.

## Qué cambia
1. **Una sola cifra.** La tarjeta de Chicó en Contabilidad mostrará el mismo efectivo en caja que ve Eliana, con su detalle: base o último arqueo, ventas en efectivo, retiros, consignaciones y gastos.
2. **Límites de caja:**
   - **Máximo de custodia: $400.000.** Al llegar o pasar de ese monto aparece la alerta "Límite de caja menor alcanzado", con la responsable (Eliana) y el saldo actual, para coordinar con Jose o Jamie. Se notifica a Jose, Jamie y Contabilidad.
   - **Mínimo: $200.000.** Si el saldo baja de ese monto, aparece una alerta de caja por debajo del mínimo. **No se bloquea ningún pago.**
   - Los límites quedan guardados como configuración del punto, para poder cambiarlos después.
3. **Gestión de la alerta** (la ven Eliana y Contabilidad), con dos opciones:
   - **A. Solicitar recogida:** quién la gestiona, fecha y estado (solicitada, recogida, cancelada). Al recogerse se registra como retiro con su soporte.
   - **B. Pagar proveedores:** se registran los pagos en efectivo con soporte, ligados a la alerta, y descuentan del saldo.
   
   La alerta queda abierta hasta que el saldo vuelva al rango, o hasta que alguien la cierre con una nota. Todo queda en el historial.
4. **Valores bien leídos.** En todos los campos de dinero del punto y de caja menor, "24.100", "24100" o "$24.100" se guardan como **$24.100**. Mientras se escribe, se muestra el valor con formato de pesos. Antes de guardar se muestra el valor interpretado.
5. **Corregir valores mal digitados sin borrar nada.** Contabilidad y admin podrán editar el valor de un retiro, consignación, gasto o arqueo. El registro original se conserva, con su fecha de creación, y se guardan:
   - el valor anterior y el nuevo;
   - el motivo de la corrección;
   - quién lo corrigió y cuándo.
   
   El saldo se recalcula. Corregiré los dos gastos de $24,1 a $24.100 con este mismo mecanismo, para que quede la trazabilidad.

## Resultado esperado con los datos de hoy
El efectivo de Chicó quedará en unos **$604.451** ($652.651 menos los $48.200 de los dos gastos corregidos). Eso supera los $400.000, así que aparecerá la alerta de límite alcanzado para gestionar la recogida o los pagos a proveedores.

## Detalles técnicos
- `pos_locations`: se agregan `cash_min` (por defecto 200000) y `cash_max_custody` (por defecto 400000).
- Tabla nueva `pos_cash_alerts`: location_id, type (max/min), balance_at_open, status (abierta, recogida_solicitada, pago_proveedores, resuelta), action, assigned_to, due_date, notes, opened/resolved by/at. Lleva GRANTs y RLS para admin, contabilidad, visualizador (solo lectura) y pos_punto de su sede.
- Tabla nueva `pos_cash_corrections`: source_table, record_id, old_amount, new_amount, reason, corrected_by/at. La corrección se hace con una función `correct_cash_amount(_table, _id, _amount, _reason)` security definer, solo para admin y contabilidad, que actualiza el monto y escribe el registro.
- Pagos a proveedores: se agrega `movement_type = 'pago_proveedor'` en `pos_cash_withdrawals` con `alert_id` opcional. `computePosCash` lo descuenta.
- `src/lib/money.ts`: `parseCOP` reemplaza `parseFloat` en PuntoRetiros y CajaMenor, y un componente `MoneyInput` muestra el valor con formato de pesos.
- `computePosCash` se reutiliza en la tarjeta de Chicó de `CajaMenor.tsx`. Una función pura `cashAlertState(balance, min, max)` define cuándo abrir o cerrar la alerta.
- Pruebas para `parseCOP` ("24.100" da 24100, "215400" da 215400, "1.234.567" da 1234567) y para los umbrales (400.000 alerta máxima, 199.999 alerta mínima, 200.000 sin alerta).
- Se guarda en memoria la regla de los límites de caja.
