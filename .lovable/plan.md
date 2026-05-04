## Objetivo

En la sección de Producción (Magical Warmers y Sweatspot), agrupar las órdenes activas por su etapa actual (Producción de cuerpos, Estampación, Dosificación, Sellado, Descristalización, Recorte, Empaque, etc.), mostrando cada grupo como una sección colapsable con el conteo de pedidos.

## Cambios

### 1. `src/components/production/MagicalWarmersWorkflow.tsx`
- Reemplazar el listado plano de `activeOrders` por un agrupamiento `Map<stage, ProductionOrder[]>` recorriendo `STAGE_ORDER` para mantener el orden del flujo.
- Renderizar cada etapa que tenga ≥ 1 orden como una sección con:
  - Encabezado: ícono de la etapa + nombre + badge con cantidad (`{n} pedido(s)`).
  - `<details>` (abierto por defecto) o un acordeón simple con los `OrderCard` correspondientes.
- Etapas sin órdenes no se renderizan (o se muestran apagadas).
- No tocar la sección de "Producción de cuerpos" (tareas) ni la de "Órdenes completadas".

### 2. `src/components/production/SweatspotWorkflow.tsx`
- Mismo patrón: agrupar `activeOrders` por `current_stage` recorriendo `FULL_STAGE_ORDER`.
- Cada grupo con encabezado (ícono + label + conteo) y los `OrderCard` adentro.

### 3. Detalles de UI
- Usar `<details><summary>` nativo (ya se usa en el archivo) para la colapsabilidad ligera, o un acordeón con borde y `bg-muted/30`.
- Mantener todo el comportamiento existente de seleccionar, iniciar y finalizar.
- Mantener el "rail" superior de etapas tal cual.

### Diagrama

```text
Órdenes de producción (12 activas)
├─ ▸ Estampación (3)
│    [OrderCard] [OrderCard] [OrderCard]
├─ ▸ Dosificación (2)
│    [OrderCard] [OrderCard]
├─ ▸ Sellado (4)
│    ...
└─ ▸ Empaque (3)
     ...
```

No se requieren cambios en base de datos ni en hooks.
