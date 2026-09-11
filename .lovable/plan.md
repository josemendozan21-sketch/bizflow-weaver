# Pedido visible en Diseño de logos pero no en Estampación

## Qué está pasando (verificado)

El caso de Jailin es el pedido de Karina Calles (ASIRIDENTAL), y en realidad son dos: **MW-PB-01109 y MW-PB-01110**.

- El logo de ambos ya está aprobado, por eso siguen apareciendo en la bandeja de logos con el botón "Finalizar".
- Cuando Inventarios los ingresó a producción, el logo todavía no estaba aprobado, así que la ruta de fabricación quedó armada **sin el paso de estampado**. Los pedidos arrancaron directo en dosificación y hoy están en "sellado".
- La vista de Estampación solo lista pedidos que están parados en estampado (o en producción de cuerpos). Como estos ya avanzaron sin pasar por ahí, no aparecen en ninguna pestaña y no hay dónde subir la foto de tamaño ni la de tinta/gel.

Revisé el resto de pedidos abiertos: solo estos dos tienen la ruta sin el paso de estampado. Los demás con estampado pendiente ya tienen sus muestras aprobadas.

## Qué se va a hacer

1. **Corregir los dos pedidos de Karina Calles**: reponer el paso de estampado en su ruta y devolverlos a estampado con las muestras pendientes, conservando el historial. Jailin podrá subir muestra de tamaño y de gel/tinta como en cualquier otro pedido.
2. **Evitar que se repita**: cuando el logo se apruebe después de que Inventarios ya ingresó el pedido, la ruta se recalcula automáticamente para incluir el paso de estampado si aún no se hizo.
3. **Red de seguridad en la vista de Estampación**: agregar una sección "Muestras pendientes" que muestre cualquier pedido con logo cuya estampación no esté finalizada, aunque ya haya avanzado a otra etapa, con los mismos botones para subir muestras. Así ningún pedido vuelve a quedar invisible.

## Detalle técnico

- Datos: en `production_orders` de MW-PB-01109 y MW-PB-01110, recalcular `stages` con `buildStages` (logo presente, sin cuerpos) y poner `current_stage='estampacion'`, `stage_status='pendiente'`; `orders.production_status` se sincroniza. No se borra nada del historial.
- `src/components/diseno/TrabajoDisenador.tsx` / flujo de aprobación de logo: al aprobar, además de mover la etapa, actualizar `stages` con `normalizeStages` cuando falte `estampacion` y la estampación no esté finalizada.
- `src/components/production/EstampacionProductionView.tsx`: nueva pestaña/sección derivada de `stampingScope` con `!isStampingDone(o)` sin restringir por `current_stage`, reutilizando los controles de muestra existentes (no se duplica lógica de avance de etapa).
- Sin cambios de esquema ni de RLS.
