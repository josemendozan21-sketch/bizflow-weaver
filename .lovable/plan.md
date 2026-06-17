## Objetivo

Agregar una pestaña **Proyección** en el detalle de cada feria que permita: (1) calcular el punto de equilibrio considerando costos + un margen objetivo, (2) simular tres escenarios de ventas (pesimista, realista, optimista) y (3) generar una propuesta de comisiones escalonadas 5/8/10% para los asesores sobre ventas antes de IVA, que el admin pueda revisar y aprobar.

---

## 1. Punto de equilibrio

Fórmula:

```text
Equilibrio = Costos_totales × (1 + margen_objetivo_%)
```

- `Costos_totales` = preferimos costos **reales** registrados; si aún no hay, caemos a **presupuestados**.
- `margen_objetivo_%` se configura por feria (default 20%).
- Se muestra:
  - Ingreso necesario para equilibrio (con IVA y sin IVA).
  - Brecha vs ventas actuales (`feria_sales.total_amount` sumadas).
  - Indicador visual (semáforo) de cuánto falta o cuánto se superó.

Las ventas registradas vienen **con IVA incluido**, así que para todo cálculo de "ventas antes de IVA" se divide entre `(1 + IVA)` con `IVA` configurable (default 19% Colombia).

## 2. Escenarios de proyección

Tres escenarios editables por feria (`pesimista`, `realista`, `optimista`). Cada escenario guarda:

- `ticket_promedio` (con IVA)
- `visitantes_esperados`
- `tasa_conversion_%`

Cálculos derivados:

```text
unidades_proyectadas   = visitantes × conversion%
ingreso_proyectado_iva = unidades × ticket_promedio
ingreso_proyectado_sin = ingreso_proyectado_iva / (1 + iva)
utilidad_proyectada    = ingreso_proyectado_iva − costos_totales
supera_equilibrio?     = ingreso_proyectado_iva ≥ equilibrio
```

Tabla comparativa de los tres escenarios + barra visual contra el punto de equilibrio.

## 3. Comisiones escalonadas

Sobre **ventas antes de IVA** y **solo el excedente por encima del equilibrio**.

Tramos por defecto (configurables por feria):

```text
Tramo 1 → 5%  desde equilibrio        hasta equilibrio × 1.25
Tramo 2 → 8%  desde equilibrio × 1.25 hasta equilibrio × 1.50
Tramo 3 → 10% desde equilibrio × 1.50 en adelante
```

Flujo:

1. La plataforma calcula automáticamente la propuesta sobre las ventas reales (`feria_sales`), distribuyendo el excedente por asesor en proporción a sus ventas, y aplica el tramo correspondiente.
2. Se muestra una tabla **"Propuesta de comisiones"** con: asesor, ventas sin IVA, excedente atribuido, % aplicado, comisión sugerida.
3. Botones **Aprobar** / **Editar** / **Rechazar** por fila y un **Aprobar todas**.
4. Al aprobar, se congelan los valores en una tabla `feria_commissions` con estado `aprobada` para uso en contabilidad/nómina.

## 4. Cambios de base de datos

Migración nueva:

- En `ferias`: agregar
  - `target_margin_pct numeric default 20`
  - `iva_pct numeric default 19`
  - `commission_tier_1_pct/2/3 numeric default 5/8/10`
  - `commission_tier_1_to/2_to numeric default 25/50` (umbral % sobre equilibrio)
  - `scenarios jsonb` — `{pesimista:{...}, realista:{...}, optimista:{...}}`
- Nueva tabla `feria_commissions`:
  - `feria_id`, `advisor_id`, `advisor_name`, `sales_with_iva`, `sales_without_iva`, `excedente`, `applied_pct`, `commission_amount`, `status` (`propuesta`/`aprobada`/`rechazada`), `approved_by`, `approved_at`, `notes`.
  - RLS: admin/contabilidad lectura+escritura; asesor lee solo las propias.
  - GRANT a `authenticated` y `service_role`.

## 5. Cambios de frontend

```text
src/components/ferias/
  FeriaProjectionTab.tsx     ← nuevo: equilibrio, escenarios, comisiones
  EditFeriaDialog.tsx        ← agrega margen objetivo, IVA y tramos
  FeriaDetail.tsx            ← nueva pestaña "Proyección" (admin/contabilidad)
src/hooks/
  useFerias.ts               ← campos nuevos en interfaz + helpers
  useFeriaCommissions.ts     ← nuevo: list/propose/approve/reject
```

Helpers puros en `src/lib/feriaProjections.ts` para el cálculo (testeables): `calcBreakEven`, `calcScenario`, `proposeCommissions`.

## 6. Permisos

- **admin / contabilidad**: ven la pestaña, editan supuestos, aprueban comisiones.
- **logística / asesor**: no ven la pestaña Proyección.
- Cada asesor podrá ver sus comisiones aprobadas más adelante en su panel (fuera del alcance de este plan, queda la tabla lista).

## 7. Validaciones y casos borde

- Si `costos_totales = 0` → mostrar aviso "Define costos antes de proyectar".
- Si no hay `feria_sales` aún → comisiones sugieren `$0` pero los escenarios siguen funcionando.
- Re-cálculo en vivo al cambiar supuestos; la propuesta de comisiones se recalcula automáticamente hasta que se aprueba (luego queda congelada).
- IVA configurable por si cambia la tarifa.
