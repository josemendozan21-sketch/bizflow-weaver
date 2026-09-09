# Estampación: el pedido vuelve a empezar después de "Finalizar"

## Qué está pasando (verificado en los datos)

Cuando Estampación finaliza un pedido, el sistema marca los dos pasos de aprobación (tamaño y tinta/gel) como "finalizado", pero la lista de Estampación fue programada para seguir mostrando esos pedidos "para que no desaparezcan sin rastro".

El problema es que el pedido sigue avanzando por Producción (sellado, empaque, etc.) y en cada nueva etapa el estado interno vuelve a "pendiente". Como la tarjeta sigue visible, vuelve a aparecer el botón "Iniciar proceso" y los pasos de aprobación de muestra en blanco: se ve como si el proceso empezara de cero y faltara la aprobación de la muestra de gel.

Hoy hay pedidos en esa situación: 4 en sellado, 1 en empaque y 3 aún en producción de cuerpos, todos con la estampación ya finalizada pero mostrándose como si estuvieran por empezar.

## Qué se va a corregir

1. **Los pedidos con estampación finalizada dejan de ser accionables.** La tarjeta se muestra en modo solo lectura: sin botón "Iniciar proceso", sin botón "Finalizar" y sin los pasos de subir foto de tamaño y de tinta/gel.
2. **Nueva pestaña "Finalizadas"** dentro de Estampación, con los pedidos ya estampados (con su historial, fotos y logo), separados de la pestaña "Órdenes", que queda solo con el trabajo real por hacer.
3. **Consistencia al finalizar.** Cuando Estampación finaliza desde la etapa de estampación, el pedido queda marcado como estampación finalizada igual que en el otro camino, para que ninguna ruta deje el pedido en un estado ambiguo que lo haga reaparecer.
4. **No se toca** el flujo de aprobación de muestra con Inventarios, ni las aprobaciones del asesor, ni las etapas siguientes de Producción.

## Detalle técnico

- `src/components/production/EstampacionProductionView.tsx`
  - Introducir `isStampingDone(o)` = `stamp_size_status === "finalizado" && stamp_inkgel_status === "finalizado"` (o `current_stage` posterior a estampación en el flujo).
  - `estampacionOrders` (pestaña "Órdenes") excluye los `isStampingDone`; se agrega `finishedOrders` para la nueva pestaña.
  - En `EstampacionOrderCard`, aceptar `readOnly`/`stampingDone`: ocultar `Iniciar proceso`, `Finalizar estampación` y los `StampApprovalStep` de carga; mostrar solo el badge "Estampación finalizada", las fotos ya cargadas y `StageLogsList`.
- `src/hooks/useProductionOrders.ts`
  - En `advanceStage`, cuando `po.current_stage === "estampacion"`, incluir `stamp_size_status: "finalizado"` y `stamp_inkgel_status: "finalizado"` en el update de la orden.
  - En `completeStamping` (rama temprana desde `produccion_cuerpos`), fijar además `stage_status: "pendiente"` para que la etapa de cuerpos no quede marcada como "en proceso" por estampación.
- Sin cambios de base de datos: los pedidos ya existentes quedan clasificados correctamente por el nuevo filtro.

## Verificación

- Revisar en la vista de Estampación que los 5 pedidos ya estampados (sellado/empaque) aparezcan en "Finalizadas" y no en "Órdenes".
- Confirmar que un pedido en producción de cuerpos con estampación finalizada ya no ofrece "Iniciar proceso".
- Typecheck del proyecto.
