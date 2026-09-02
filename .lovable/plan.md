# Nueva fase: "Elaboración de esquinas" (Sweatspot)

## Qué se agrega
Un proceso nuevo entre **Producción de tubos** y **Ensamble de cuello**, dentro del flujo completo de Sweatspot (cuando hay que fabricar cuerpos/tubos).

Flujo completo resultante:
1. Estampación (solo si lleva logo)
2. Producción de tubos
3. **Elaboración de esquinas** (nuevo)
4. Ensamble de cuello
5. Sello de base
6. Refile
7. Colocación de boquilla
8. Listo

## Cuándo aplica
Solo para termos de:
- 500 ml (con y sin correa)
- 250 ml mini

Cualquier otra referencia/tamaño conserva el flujo actual sin la fase nueva. El flujo corto (con cuerpos en stock) tampoco la incluye.

## Alcance
La fase se ve igual en todas las vistas y roles: tablero de producción Sweatspot, estampación, dashboard, alertas, historial de fases y seguimiento de pedidos del asesor.

Los pedidos ya existentes que estén en curso mantienen su flujo actual; la fase aplica a los pedidos nuevos (y a los que se recalculen por normalización de etapas).

## Detalles técnicos
- `src/types/sweatspotProduction.ts`: agregar `elaboracion_esquinas` al tipo `SweatspotProductionStage`, a `FULL_STAGE_ORDER` y a `SS_STAGE_LABELS`.
- `src/lib/orderFlow.ts`: en `buildStages` para `sweatspot`, insertar `elaboracion_esquinas` después de `produccion_tubos` solo si el producto califica. Se agrega un helper `needsEsquinas(product)` que detecta 500 ml (con/sin correa) y 250 ml mini reutilizando `thermoSizeOf`. `normalizeStages` hereda la regla automáticamente.
- `src/pages/Ventas.tsx` (~línea 2078): usar la misma regla al construir `ssFullStages` en la creación del pedido (preferible: llamar a `buildStages` para no duplicar lógica).
- Etiquetas: `src/hooks/useProductionOrders.ts`, `src/hooks/useProductionAlerts.ts`, `src/components/production/EstampacionProductionView.tsx`, `src/components/production/SweatspotWorkflow.tsx` (label + icono + su `FULL_STAGE_ORDER` local).
- `src/pages/Index.tsx`: mapear `elaboracion_esquinas` en `stageToKanban` (columna `estampacion`, junto a producción de tubos/ensamble).
- `src/pages/Eventos.tsx`: incluir la etapa en el mismo grupo de color que producción de tubos (pre-estampado/en proceso, según corresponda).
- No se requieren cambios de base de datos: `stages` y `current_stage` son texto libre.
