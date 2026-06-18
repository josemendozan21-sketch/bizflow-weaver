## Hallazgos sobre "Pie" de Luz

Revisé la base de datos y NO existe un registro de finalización de cuerpos "Pie" hecho desde el flujo de Producción:

- **`body_production_tasks`** no tiene ningún task de "Pie" finalizado. Lo único activo es "Pie Separado" 300 uds, todavía **en_proceso**.
- El único movimiento reciente de "Pie" es una **entrada manual de 20 uds** registrada el 18/06 17:50 directamente por `inventarios1@bionovationsas.com` (sin marcador `AUTO_REQ`, sin `purpose`, sin pasar por el botón "Finalizar y enviar a inventario"). Dos minutos después salieron 305 uds para Cesar Marín / Laboratorios Remo.
- `body_stock` de Pie quedó en **15 uds**.

Conclusión: Luz no finalizó la producción usando el botón "Finalizar y enviar a inventario" del workflow Magical. Por eso no apareció una notificación de "Cuerpos finalizados — confirmar recepción" para Inventarios, y la entrada que sí existe la tuvo que digitar Inventarios a mano. Con la nueva pestaña de Historial en Producción esto será evidente de inmediato (Luz verá que su finalización no quedó registrada y podrá repetirla por el flujo correcto).

## Plan: Pestaña "Historial" en Producción

**Archivo:** `src/pages/Produccion.tsx`

Agregar una tercera pestaña al `Tabs` existente (`marcas` / `rollos` / **`historial`**), visible para todos los usuarios que ya ven la página de Producción.

**Componente nuevo:** `src/components/production/ProductionMovementHistory.tsx`

- Reutiliza el hook `useInventoryMovements`.
- Filtra estrictamente por `area === "produccion"` (entradas y salidas que pasaron por el área, sin importar marca).
- Reusa la misma tabla/visual de `MovementHistoryTable` (columnas: fecha, ítem, marca, categoría, tipo de movimiento, cantidad, motivo, registrado por, estado de recepción).
- Mantiene filtros de búsqueda, marca, categoría y tipo de movimiento.
- **Modo solo lectura**: no se muestra el botón "Confirmar recepción" (esa acción sigue siendo exclusiva de Inventarios desde su propio Historial).
- Muestra un badge claro cuando `reception_confirmed === false` para que Producción sepa qué finalizaciones aún están pendientes de que Inventarios las acepte.

No se toca la lógica de inventario, el workflow Magical, ni el Historial de Inventarios.

### Notas técnicas

```text
Produccion.tsx
└─ Tabs
   ├─ Marcas        (existente)
   ├─ Corte de Rollos (existente)
   └─ Historial     (NUEVO) → <ProductionMovementHistory />
```

`ProductionMovementHistory` = copia adelgazada de `MovementHistoryTable` sin `confirmReception`, con `movements.filter(m => m.area === "produccion")` aplicado antes de los filtros de UI.
