# Presupuesto por cuenta contable (alineado con W.O.)

Reemplazar el esquema actual de Presupuesto "por concepto" por un esquema **por cuenta contable**, y cargar la ejecución real Enero–Julio 2026 del archivo entregado.

## Qué se borra

- Se eliminan todos los datos existentes de la sección Presupuesto: presupuestos mensuales, líneas proyectadas y movimientos registrados.
- Los movimientos bancarios creados desde Presupuesto quedan huérfanos: se limpian también las referencias de tipo "budget_entry" para no dejar saldos inconsistentes.
- Bancos, caja menor y pagos programados no se tocan.

## Nuevo modelo

1. **Catálogo de cuentas contables** con las 42 cuentas del archivo, cada una con:
   - Grupo contable: 51 (admón), 52 (ventas), 53 (no operacionales), 61 (insumos), 72 (laboral producción), 73 (producción).
   - Nombre de la cuenta (ej. "Arrendamientos", "Gravamen Mov Financiero").
   - Naturaleza: costo o gasto (los grupos 61/72/73 se marcan como costo; 51/52/53 como gasto).
   - Estado activo, editable por Administrador y Contabilidad.
2. **Ejecución real por cuenta y mes**: un valor por cuenta / año / mes, con posibilidad de editar, y de cargar un mes completo desde plantilla Excel.
3. **Presupuesto proyectado por cuenta y mes**: misma estructura, se deja vacío para llenarlo mes a mes desde la app.
4. **Ingresos**: se dejan vacíos por ahora (a la espera de las cuentas 4x).

## Carga inicial

Se cargan los valores Enero a Julio de **2026** del archivo como **ejecución real**, cuenta por cuenta (solo celdas con valor; las vacías quedan sin registro). No se cargan las filas de totales; los totales se calculan en la app.

## Interfaz

- Pestaña **Presupuesto** rediseñada: selector de año y mes, y tabla agrupada por grupo contable (51, 52, 53, 61, 72, 73) con columnas Cuenta / Presupuestado / Real / Diferencia / % ejecución, y subtotales por grupo más total general.
- Vista **Anual**: matriz cuentas × meses (Ene–Dic) con total por cuenta y por mes, tal como el archivo.
- **Carga mensual**: botón para subir un Excel con el mismo formato (Concepto + meses) que actualiza los valores del mes/año seleccionado, con vista previa de filas reconocidas y avisos de cuentas no encontradas.
- **Exportar a Excel** el año o el mes en el mismo formato.
- **Gestión del catálogo**: agregar, editar y desactivar cuentas (Administrador y Contabilidad).

## Detalle técnico

- Migración: borrar datos de `budget_entries`, `budget_lines`, `monthly_budgets`; crear `accounting_accounts` (group_code, name, kind, active) y `accounting_monthly_amounts` (account_id, year, month, kind: real/presupuesto, amount), con GRANTs y RLS (lectura para autenticados; escritura para admin y contabilidad).
- Semilla del catálogo con las 42 cuentas y carga de los valores 2026 Ene–Jul vía inserts.
- Frontend: nuevo hook `useAccountingBudget.ts`, reescritura de `src/pages/Presupuesto.tsx`, retiro de `DefineBudgetDialog.tsx` por concepto y de las listas de categorías en `useMonthlyBudget.ts` que ya no aplican; parser/exportador Excel en `src/lib/budgetExcel.ts`.
