
# Rediseño de Escenarios y Comisiones

## Cambio de enfoque

Los escenarios dejan de depender de visitantes/conversión/ticket y pasan a basarse en **% de mercancía vendida sobre el inventario asignado a la feria**.

### Datos base (ya disponibles en `feria_inventory`)
- **Inventario valorizado con IVA** = Σ `quantity_assigned × unit_price`
- **Costo de mercancía** = Σ `quantity_assigned × unit_cost` (informativo)

### Tres escenarios fijos (alineados a las comisiones)
| Escenario | % mercancía vendida | Comisión asociada |
|---|---|---|
| Pesimista | 60% | 5% |
| Realista  | 70% | 8% |
| Optimista | 90% | 10% |

Los porcentajes (60/70/90 y 5/8/10) serán **editables** por feria desde el mismo tab — no se piden visitantes ni conversión.

### Cálculo por escenario
```
ingreso_con_iva  = inventario_total_con_iva × (% vendido)
ingreso_sin_iva  = ingreso_con_iva / (1 + IVA)
excedente        = ingreso_sin_iva − punto_equilibrio_sin_iva
utilidad         = ingreso_con_iva − costos_totales
comision_total   = max(0, excedente) × (% comisión del escenario)
utilidad_neta    = utilidad − comision_total
supera_equilibrio = ingreso_con_iva ≥ punto_equilibrio_con_iva
```

### UI del tab "Proyección"
- Sección **Punto de equilibrio** (sin cambios).
- Sección **Inventario disponible**: muestra unidades totales, valor con IVA y costo de mercancía.
- Sección **Escenarios de venta** (reemplaza la actual):
  - 3 tarjetas (Pesimista / Realista / Optimista) cada una con:
    - Input `% mercancía vendida` (default 60/70/90)
    - Input `% comisión` (default 5/8/10)
    - Resumen: ingreso con/sin IVA, excedente sobre equilibrio, utilidad bruta, comisión total, utilidad neta, badge "Supera/No alcanza equilibrio".
- Sección **Propuesta de comisiones por asesor**: se mantiene igual (sobre ventas reales registradas, usando los tramos actuales del feria). No se toca.

## Cambios técnicos

### Datos
- `ferias.scenarios` (jsonb) pasa de `{ ticket_promedio, visitantes_esperados, tasa_conversion_pct }` a:
  ```json
  {
    "pesimista": { "pct_inventario": 60, "pct_comision": 5 },
    "realista":  { "pct_inventario": 70, "pct_comision": 8 },
    "optimista": { "pct_inventario": 90, "pct_comision": 10 }
  }
  ```
- Migración: `UPDATE ferias SET scenarios = '<nuevo default>'::jsonb` para resetear el formato anterior (no estaba en uso productivo).

### Código
- `src/hooks/useFerias.ts`: actualizar interface `ScenarioInput` → `{ pct_inventario, pct_comision }`.
- `src/lib/feriaProjections.ts`:
  - `calcScenario(s, feria, be, inventarioConIva)` con la nueva fórmula.
  - Devuelve además `comision_total` y `utilidad_neta`.
  - Se mantienen `calcBreakEven` y `proposeCommissions` (ventas reales) sin cambios.
- `src/components/ferias/FeriaProjectionTab.tsx`: nueva UI de tarjetas con 2 inputs por escenario y nuevas filas de resumen. Usa `useFeriaInventory(feriaId)` para calcular el inventario total con IVA.
- `EditFeriaDialog.tsx` / `CreateFeriaDialog.tsx`: no requieren cambios (los % se editan inline en el tab).

## Edge cases
- Si la feria no tiene inventario cargado: mostrar aviso "Carga el inventario para proyectar escenarios" y los ingresos quedan en $0.
- Si `punto_equilibrio_sin_iva = 0`: excedente = ingreso_sin_iva (toda la venta entra a comisión).
- Validación: `pct_inventario` y `pct_comision` entre 0 y 100.
