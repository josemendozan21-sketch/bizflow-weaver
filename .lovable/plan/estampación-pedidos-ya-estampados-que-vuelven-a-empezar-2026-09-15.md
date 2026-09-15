# Estampación: pedidos ya estampados que vuelven a empezar

## Qué está pasando (verificado en los datos)

Cuando Estampación termina un pedido mientras los cuerpos todavía se fabrican, el sistema lo marca como estampación finalizada, pero el pedido se queda en la etapa "producción de cuerpos" (es Producción quien la cierra). La lista de Estampación fue ajustada para mostrar todo lo que esté en estampación o en cuerpos, así que esos pedidos siguen apareciendo en la bandeja de trabajo con los botones de "Iniciar proceso" y los pasos de aprobación en blanco: se ve como si empezaran de cero.

Hoy hay 5 pedidos exactamente en esa situación (estampación finalizada, todavía en producción de cuerpos), que es lo que están reportando.

## Qué se va a corregir

1. **Separar "muestra aprobada" de "estampación finalizada".**
   - Aprobado por el asesor = autorización para estampar, el pedido sigue siendo trabajo pendiente.
   - Finalizado por Estampación = el trabajo ya se hizo; el pedido sale de la bandeja de trabajo aunque Producción todavía tenga los cuerpos en curso.
2. **Los pedidos ya estampados pasan a la pestaña "Finalizadas"**, en modo consulta: se ven las fotos, el logo y el historial, sin botones de iniciar/finalizar ni pasos de carga, para que nadie los reinicie.
3. **La pestaña "Órdenes" queda solo con trabajo real:** pedidos en estampación o en cuerpos cuyas muestras aún no están finalizadas por Estampación.
4. **"Muestras pendientes" no cambia:** sigue como red de seguridad para pedidos con muestras sin resolver que ya avanzaron de etapa.
5. No se tocan las aprobaciones del asesor, el flujo con Inventarios ni las etapas de Producción.

## Detalle técnico

- `src/components/production/EstampacionProductionView.tsx`
  - Nueva `isStampingFinished(o)` = `stamp_size_status === "finalizado" && stamp_inkgel_status === "finalizado"`.
  - `estampacionOrders` = `isStageActive(o) && !isStampingFinished(o)`.
  - `finishedOrders` = `isStampingFinished(o)` (sin importar la etapa actual) más los que ya salieron de estampación/cuerpos con muestras resueltas.
  - `missedStamping` sin cambios (`!areSamplesDone && !isStageActive`).
  - En `EstampacionOrderCard`, las tarjetas de "Finalizadas" se renderizan en modo solo lectura (ya existe ese modo para la pestaña).
- Sin cambios de base de datos: los 5 pedidos actuales se reclasifican solos con el nuevo filtro.

## Verificación

- Confirmar que los 5 pedidos con estampación finalizada en producción de cuerpos aparecen en "Finalizadas" y no ofrecen "Iniciar proceso".
- Confirmar que los pedidos con muestras solo "aprobadas" siguen en "Órdenes" con sus botones.
- Typecheck del proyecto.
