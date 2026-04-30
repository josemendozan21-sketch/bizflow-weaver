# Presupuesto mensual (sección independiente)

Crear una **nueva sección** en el menú lateral llamada **"Presupuesto"** (ruta `/presupuesto`), visible **solo** para los roles `admin` y `contabilidad`. Será una página dedicada para proyectar el mes, registrar movimientos reales y visualizar gráficas comparativas.

## Página `/presupuesto`

### Encabezado
- Selector de mes/año (« mes anterior · mes actual · mes siguiente »).
- Botón **"Definir presupuesto del mes"** (abre formulario con todas las categorías para poner montos proyectados).
- Botón **"Cerrar mes"** (deja el mes en solo lectura).

### KPIs (4 tarjetas)
- Ingresos: **proyectado vs real** + % cumplimiento.
- Egresos: **proyectado vs real** + % cumplimiento.
- Utilidad proyectada vs utilidad real.
- Saldo del mes (proyectado − gastado a la fecha).

### Gráficas
1. **Barras comparativas** ingresos vs egresos (proyectado vs real).
2. **Barras por categoría de egresos** (proyectado vs real) — materia prima, nómina, seguridad social, gastos diarios, otros.
3. **Donut de composición de ingresos reales** (asesores mayor, asesores menor, ferias, otros).
4. **Línea histórica 12 meses**: utilidad real vs proyectada.

### Tablas editables
- **Ingresos**: categoría · descripción · proyectado · real · diferencia · % cumplimiento.
   Categorías: Ventas asesores (mayor), Ventas asesores (menor), Ferias, Otros.
- **Egresos**: categoría · descripción · proyectado · real · diferencia · % cumplimiento.
   Categorías: Compra materia prima, Gastos diarios, Nómina, Seguridad social, Servicios, Arriendo, Otros.

Cada fila tiene botón **"Agregar movimiento real"** → modal con monto, fecha, descripción y soporte opcional.

### Auto-cálculo (lecturas automáticas)
Para no duplicar trabajo, ciertos "reales" se leen del sistema:
- **Ventas asesores reales** = `SUM(orders.total_amount)` del mes con `invoice_status='facturado'`, separado por `sale_type`.
- **Ferias reales** = `SUM(feria_sales.total_amount)` del mes.
- **Gastos diarios reales** = `SUM(petty_cash_expenses.amount)` del mes.

Aparecen como base, y los movimientos manuales se suman encima.

## Cambios técnicos

### Base de datos (migración)
Tres tablas nuevas:

1. **`monthly_budgets`** — un registro por mes:
   `id, year, month, status ('abierto'|'cerrado'), notes, created_by, created_at, updated_at`. Único por `(year, month)`.

2. **`budget_lines`** — líneas presupuestadas (categorías):
   `id, budget_id, kind ('ingreso'|'egreso'), category, description, projected_amount, created_at, updated_at`.

3. **`budget_entries`** — movimientos reales manuales:
   `id, budget_id, kind, category, description, amount, entry_date, proof_url, recorded_by, recorded_by_name, created_at`.

**RLS**: solo `admin` y `contabilidad` con SELECT/INSERT/UPDATE/DELETE en las tres.

**Storage**: bucket privado `budget-receipts` con políticas para `admin` + `contabilidad`.

### Frontend
- Nueva página `src/pages/Presupuesto.tsx`.
- Componentes en `src/components/presupuesto/`:
   - `BudgetKPIs.tsx`
   - `BudgetCharts.tsx` (usa Recharts, ya disponible vía `@/components/ui/chart`)
   - `BudgetIncomeTable.tsx`
   - `BudgetExpenseTable.tsx`
   - `DefineBudgetDialog.tsx`
   - `AddEntryDialog.tsx`
- Hook `src/hooks/useMonthlyBudget.ts` con queries/mutations.
- Registrar la ruta en `src/App.tsx` dentro del `DashboardLayout`.
- Agregar item al menú en `src/components/AppSidebar.tsx` (icono `PiggyBank` o `Wallet`).
- Actualizar `src/lib/rolePermissions.ts`:
   - `ROLE_ROUTES.admin` y `ROLE_ROUTES.contabilidad` incluyen `/presupuesto`.
   - `ROLE_EDIT_SECTIONS.admin` y `ROLE_EDIT_SECTIONS.contabilidad` incluyen `/presupuesto`.
- `RequireRoleRoute` (o equivalente) protege la ruta para que otros roles vean 404/redirect.

## Visibilidad

- **Admin** y **Contabilidad**: ven el ítem en el sidebar y entran a la página.
- **Resto de roles**: el ítem no aparece (ya lo filtra `canAccessRoute`) y RLS bloquea las queries.

## Fuera de alcance (futuro)

- Notificaciones cuando un gasto supera el proyectado.
- Exportar el presupuesto a Excel/PDF.
- Flujo de aprobación de gastos.
