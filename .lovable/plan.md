# Caja menor: cifras reales por sede (Toberín y Chico)

## Qué está pasando hoy

Revisé los registros y las fórmulas. El saldo se infla por dos motivos concretos, no por un error de suma:

1. **Los ingresos incluyen el saldo anterior.** El formulario dice "este monto se suma al saldo disponible", pero varios registros se cargaron con el efectivo total contado, que ya incluía la plata que estaba en caja. Ejemplos reales: tres registros con la nota "Saldo día anterior $47.400" por 47.400, 57.400 y 97.400; "Saldo disponible $14.200 + ingresa $250.000" cargado como 264.200; "Feria Vassar + base anterior $179.600" cargado como 650.850. Cada uno de esos vuelve a sumar plata que ya estaba contada.
2. **No hay sede.** Toberín y Chico comparten un mismo libro sin etiqueta, así que los gastos de una sede no cruzan contra los ingresos de la otra y el saldo mostrado no corresponde a ninguna caja física. Además hay dos movimientos de "Dotación: compra de guantes $9.000" cargados como ingreso en vez de gasto.

En Chico (punto 92) el efectivo se calcula como base fija ($215.400) + todas las ventas en efectivo desde junio − retiros − consignaciones, sin cierre diario y sin manera de registrar gastos en efectivo del punto. Además los movimientos rechazados aparecen en el libro diario pero no en el indicador, así que las dos cifras no coinciden.

No se borra ningún dato histórico.

## Qué vamos a construir

### 1. Sede en cada movimiento
- Cada ingreso y cada gasto queda etiquetado con sede: **Toberín (Bodega Principal)** o **Chico (Tienda 92)**.
- Un solo libro consolidado con filtro por sede, y tarjetas de saldo: total, Toberín y Chico.
- Los movimientos existentes quedan marcados como Toberín por defecto y contabilidad puede reasignar sede sin perder el registro.

### 2. Tipo de movimiento (esto arregla la duplicación)
Cada registro pasa a tener un tipo explícito:
- **Ingreso nuevo**: plata que entra; suma al saldo.
- **Gasto**: resta al saldo.
- **Saldo inicial / ajuste por conteo**: *no suma*, fija el saldo de esa sede en ese momento. Los registros históricos que traen "saldo anterior" se reclasifican a este tipo (conservando monto, nota, fecha y autor), con lo que dejan de duplicarse.
- **Traslado entre sedes**: sale de una y entra en la otra, sin alterar el total.

El formulario de ingreso explica claramente la diferencia y valida que no se registre un total contado como ingreso nuevo.

### 3. Arqueo diario por sede
- Botón de cierre del día por sede: se digita el efectivo contado.
- El sistema muestra saldo teórico, contado y la diferencia (sobrante/faltante) con opción de dejar observación.
- Historial de arqueos con las diferencias, exportable.

### 4. Gastos en efectivo desde el punto 92
- El asesor del punto puede registrar gastos en efectivo con soporte; quedan pendientes hasta que contabilidad los apruebe.
- Esos gastos descuentan del efectivo del punto y aparecen en el libro de caja menor con sede Chico, para que sí crucen.

### 5. Fórmulas consistentes
- Saldo por sede = último saldo inicial/ajuste de esa sede + ingresos posteriores − gastos posteriores ± traslados.
- En el punto 92, el efectivo en caja parte del último arqueo (no de una base fija de junio) + ventas en efectivo posteriores − retiros − consignaciones − gastos del punto.
- Los movimientos rechazados se excluyen tanto del indicador como del saldo acumulado del libro, así que las dos cifras siempre coinciden.
- El indicador "Caja empresa" del tablero y la exportación a Excel usan exactamente la misma fórmula, con desglose por sede.

## Detalle técnico

- Migración: agregar a `petty_cash_funds` y `petty_cash_expenses` las columnas `sede` (`toberin` | `chico`, por defecto `toberin`) y a `petty_cash_funds` un `movement_kind` (`ingreso` | `saldo_inicial` | `traslado_entrada`) con default `ingreso`; en gastos, `origin` (`contabilidad` | `punto`) y `status` (`pendiente` | `aprobado` | `rechazado`, default `aprobado` para lo existente). Nueva tabla `petty_cash_counts` (sede, fecha, saldo teórico, contado, diferencia, notas, usuario) con GRANTs y RLS para admin/contabilidad, y lectura/escritura de gastos del punto para el rol `pos_punto` limitada a sede Chico.
- Reclasificación de datos (sin borrar): marcar como `saldo_inicial` los registros cuya nota indica saldo/base anterior, y como gasto los dos registros de dotación de guantes, mediante actualización de datos revisable antes de aplicar.
- Nuevo `src/lib/pettyCash.ts` con el cálculo único de saldos (por sede, con corte en el último `saldo_inicial`) usado por `CajaMenor.tsx`, `Index.tsx` (KPI Caja empresa), `accountingExports.ts`, `PuntoRetiros.tsx` y `PuntoReportes.tsx`.
- `CajaMenor.tsx`: selector de sede, tipo de movimiento, traslados, panel de arqueo y aprobación de gastos del punto.
- `PuntoRetiros.tsx` / `PuntoReportes.tsx`: registro de gasto en efectivo, arqueo del punto y cálculo basado en el último arqueo; se unifica el tratamiento de rechazados.
