
## Cambios al módulo Presupuesto mensual

### 1. Reclasificación de categorías

Reemplazar `INCOME_CATEGORIES` y `EXPENSE_CATEGORIES` por 4 grupos con sus conceptos:

- **Ingreso**: Ventas al detal, Ventas al por mayor, Ferias, Punto 92, Otros ingresos, Sub Arriendos
- **Costo**: Materia Prima, Producto terminado
- **Gasto**: Nómina, Prima de servicios, Seguridad social, Cesantías, Agua, Luz, Arriendo, Internet, Telesentinel, Marketing, Contador, Pólizas y Seguros, Aseo, Mensajería, Gerencia, Asesores Empresa, Asesores Eventos, CCB, Stand, Publicidad stand, Transporte, Tiquetes, Viáticos
- **Pasivo**: IVA, Renta, Reteiva

La tabla `budget_lines` y `budget_entries` ya tienen `kind` (texto). Lo ampliamos para aceptar `ingreso | costo | gasto | pasivo`. La UI mostrará 4 tablas (una por grupo) con proyectado vs real, en lugar de 2.

Las lecturas automáticas (`useAutoReadings`) se mantienen y se mapean a las categorías de Ingreso correspondientes.

### 2. Bancos / cuentas con saldo

Nueva tabla `bank_accounts`:
- nombre, saldo_inicial, saldo_actual, notas

Cuentas iniciales a sembrar: Bancolombia 68, Bancolombia 36, Davivienda, Nequi, Efectivo, Fiducuenta.

Nueva tabla `bank_movements` (auditoría):
- bank_account_id, fecha, tipo (ingreso/egreso), monto, concepto, referencia (entry_id o scheduled_payment_id)

Sección nueva "Bancos" en la página con tarjetas por cuenta mostrando saldo actual y un botón para registrar ajuste manual. Cada vez que se registra un movimiento real (ingreso o pago) se elige el banco origen/destino y el saldo se actualiza automáticamente.

### 3. Calendario de Ingresos

Tab/sección nueva "Calendario de ingresos":
- Calendario mensual (shadcn Calendar)
- Cada día muestra suma de ingresos reales registrados ese día (de `budget_entries` kind=ingreso + lecturas automáticas)
- Al hacer click en un día, panel lateral con desglose por categoría/banco
- Solo visualización (los ingresos siguen registrándose desde su tabla)

### 4. Calendario de Pagos programados (flujo completo)

Nueva tabla `scheduled_payments`:
- categoría (de Costo/Gasto/Pasivo), descripción, monto_presupuestado, fecha_vencimiento, banco_origen_id, estado (pendiente/pagado), monto_real, fecha_pago, proof_url, notas

Tab "Calendario de pagos":
- Calendario mensual con pagos pendientes y pagados por día
- Botón "Programar pago" → categoría, monto, fecha, banco
- Click en un pago → diálogo "Marcar como pagado" pidiendo **monto real** (puede diferir del presupuestado), fecha, soporte
- Al marcar pagado:
  - Crea un `budget_entry` (egreso real) por el monto real
  - Crea un `bank_movement` que descuenta el banco
  - Pone estado=pagado

KPIs nuevos: "Pagos del mes presupuestados" vs "Pagos reales" para ver diferencia.

### 5. Cambios en UI principal

- KPIs ampliados a: Ingresos, Costos, Gastos, Pasivos, Utilidad
- Tabla única reemplazada por 4 tablas colapsables (una por kind)
- Tabs en la parte superior: **Resumen** | **Bancos** | **Calendario ingresos** | **Calendario pagos**
- `DefineBudgetDialog` actualizado para permitir definir líneas en los 4 tipos
- `AddEntryDialog` pide adicionalmente el banco (cuando es ingreso/egreso real)

### Notas técnicas

- Migraciones nuevas: `bank_accounts`, `bank_movements`, `scheduled_payments` con RLS (admin + contabilidad gestionan; resto sin acceso) y triggers que actualicen `bank_accounts.saldo_actual` al insertar `bank_movements`.
- Inserción inicial de las 6 cuentas con saldo 0 (el usuario podrá editar los saldos iniciales desde la UI de Bancos).
- Hooks nuevos: `useBankAccounts`, `useScheduledPayments`, `usePayScheduled`.
- Sin tocar lógica de ventas/ferias existente.
