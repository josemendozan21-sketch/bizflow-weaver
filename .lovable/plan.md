
## Objetivo

1. Medir y comisionar el cumplimiento de fechas de entrega de las áreas **Producción**, **Estampación** y **Logística**.
2. Reorganizar la vista de **Producción de Cuerpos** para que los pedidos se agrupen por **referencia** y por **tipo de plástico** (Frío/Calor) en bloques separados.

---

## Parte 1 — Comisiones por cumplimiento

### Modelo de fechas por etapa (hitos)

Cada pedido al por mayor tendrá una fecha objetivo y una fecha real por etapa:

| Etapa | Área | Fecha objetivo | Fecha real |
|---|---|---|---|
| Cuerpos / Llenado | Producción | `production_due_date` | `production_completed_at` |
| Estampación | Estampación | `stamping_due_date` | `stamping_completed_at` |
| Despacho | Logística | `delivery_date` (existente) | `dispatched_at` (existente) |

- Las fechas objetivo por etapa se calculan automáticamente al crear el pedido como hitos hacia atrás desde `delivery_date` (ej.: Producción = entrega − 5 días, Estampación = entrega − 2 días). Estos offsets serán configurables.
- Las fechas reales se registran cuando cada área marca su etapa como completada (la mayoría de hooks ya existen; agregamos columnas nuevas para timestamp por etapa).

### Cálculo "a tiempo"

Un pedido cuenta como **a tiempo** para un área si `fecha_real ≤ fecha_objetivo` de esa etapa. Pedidos sin fecha real aún no cuentan; pedidos vencidos sin entregar cuentan como atrasados.

### Comisión

- **% sobre pedidos a tiempo del mes**, por área.
- Regla configurable por área en una tabla `area_compliance_rules` (umbral mínimo, % comisión sobre base, base = total facturado del mes que pasó por esa etapa, o monto fijo por pedido — empezamos con: % sobre el valor SIN IVA de los pedidos que esa área entregó a tiempo).
- Bonos por hito (ej. ≥90% cumplimiento mensual desbloquea bono fijo) configurables.

### UI

- **Contabilidad → nueva pestaña "Comisiones por área"**: tarjetas por área con % cumplimiento, pedidos a tiempo / atrasados, comisión calculada, lista detallada de pedidos con semáforo (verde a tiempo / rojo atrasado / amarillo pendiente vencido).
- **Producción / Estampación / Logística → banner "Mi cumplimiento del mes"** con KPI rápido para que el área vea cómo va.
- **Tarjeta de pedido**: badges con fecha objetivo de la etapa actual y días restantes / días de atraso.

### Cambios técnicos

- Migración: añadir a `orders` las columnas `production_due_date`, `production_completed_at`, `stamping_due_date`, `stamping_completed_at`. Crear tabla `area_compliance_rules (area, percentage, min_threshold_pct, bonus_amount, bonus_threshold_pct, active)`.
- Trigger / lógica en los hooks existentes (`useProductionOrders`, `EstampacionProductionView`, despacho de logística) para escribir el timestamp real al cambiar de etapa.
- Nueva utilidad `src/lib/compliance.ts` con `summarizeAreaCompliance(orders, area, month)` análoga a `commissions.ts`.
- Nuevo componente `AreaCompliancePanel.tsx` reutilizable + pestaña en `Contabilidad.tsx`.
- Exportar también las métricas de cumplimiento en el Excel del área contable.

---

## Parte 2 — Agrupación en Producción de Cuerpos

Refactor visual de `BodyProductionSection` / `MagicalWarmersWorkflow` (sección cuerpos):

- Dos columnas separadas: **Frío** y **Calor**.
- Dentro de cada columna, las tareas pendientes se agrupan **por referencia** en una sola tarjeta con:
  - Nombre de referencia + total de unidades sumadas.
  - Lista colapsable de pedidos / clientes que componen ese total.
  - Botones de acción a nivel de grupo: "Iniciar producción del lote", "Completar lote" (que marca todas las tareas hijas).
- Contador por columna (total unidades pendientes) y filtro por estado (pendiente / en proceso).
- No se modifica el modelo de datos: la agrupación es en cliente sobre `body_production_tasks` por `tipo_plastico` y `referencia`.

---

## Detalles técnicos resumidos

```text
DB (migración)
  orders +production_due_date date
         +production_completed_at timestamptz
         +stamping_due_date date
         +stamping_completed_at timestamptz
  area_compliance_rules(area text, percentage numeric,
                        min_threshold_pct numeric, bonus_amount numeric,
                        bonus_threshold_pct numeric, active bool)

Frontend
  src/lib/compliance.ts                       (cálculo por área)
  src/components/contabilidad/AreaCompliancePanel.tsx
  src/components/contabilidad/AreaComplianceRules.tsx (config admin)
  src/pages/Contabilidad.tsx                  (nueva pestaña)
  src/components/production/BodyProductionGroupedView.tsx (agrupación)
  src/components/production/MagicalWarmersWorkflow.tsx     (integrar agrupación)
  Banner KPI en Produccion.tsx / EstampacionProductionView.tsx / Logistica.tsx
```

### Orden de implementación

1. Migración DB (columnas + tabla de reglas, con valores por defecto).
2. Lógica de timestamps al completar etapas en los hooks existentes.
3. `compliance.ts` + panel en Contabilidad + banners por área.
4. Refactor visual de Producción de Cuerpos con agrupación.

¿Apruebas para comenzar?
