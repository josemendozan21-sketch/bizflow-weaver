# Producción: pedidos que no aparecen y fases que se saltan

Revisé el código del flujo (creación de la orden de producción, tablero por etapas, avance de fase) y los datos reales. Encontré 6 causas concretas, no una sola.

## Lo que está pasando hoy (verificado en datos y código)

1. **Pedidos que nunca llegan a Producción.** Hay 21 pedidos en estado "pendiente" sin orden de producción creada (los más viejos del 11 de agosto: A Tu salud VARGAS, UNITRAUMAX, DR Manuel.Morenio, DISTRISANCHEZ, etc.). La orden de producción solo nace cuando Inventarios la rutea; si nadie la rutea, el pedido queda invisible para Producción sin ninguna alerta.
2. **Órdenes sin número de pedido.** Las órdenes de producción creadas recientemente quedan con `order_code` vacío (3 creadas hoy, entre ellas DR ERIC y FENDESA). En el tablero salen sin código y no se encuentran al buscar por número.
3. **Órdenes activas que existen pero no se dibujan.** El tablero cuenta como "activas" todas las que no están en "listo", pero solo pinta tarjetas para las etapas de su lista fija. Cualquier orden en una etapa fuera de esa lista (hoy 123 en "despachado", y cualquier etapa de otra marca) suma al contador pero no aparece en pantalla: el equipo ve "12 activas" y solo 9 tarjetas.
4. **Salto de fases al finalizar.** Si la etapa actual no está dentro del arreglo de etapas de esa orden (hay 123 órdenes con esa inconsistencia), el cálculo del "siguiente paso" devuelve -1 y la orden salta a la **primera** etapa del flujo o a una etapa vacía. Ese es el origen de "se saltó dosificación" / "volvió a cuerpos".
5. **Flujo guardado que no coincide con la orden.** Hay órdenes marcadas como "no necesita cuerpos" cuyo flujo guardado sí incluye Producción de cuerpos (y al revés). La barra de progreso oculta esa etapa pero el cálculo interno la sigue contando, lo que descuadra las fases.
6. **Estampación ve pedidos que no le corresponden y pierde otros.** Estampación muestra toda orden en "producción de cuerpos", incluso las sin logo (que no pasan por estampación). Y cuando cuerpos avanza con las aprobaciones ya finalizadas, la orden salta estampación y desaparece de esa vista sin rastro.

## Qué se va a corregir

**A. Que ningún pedido se quede invisible**
- Bandeja "Pedidos sin ruteo" en Inventarios y en Producción (solo lectura para Producción): pedidos aprobados sin orden de producción, con días de antigüedad y semáforo (>2 días en rojo).
- Rellenar el número de pedido en las órdenes de producción al crearlas y completar los 4 registros que hoy están sin código, para que la búsqueda por número funcione.

**B. Que el tablero muestre siempre todo**
- Agrupar por etapa como hoy, pero agregar un bloque final "Otras etapas / fuera de flujo" que recoge cualquier orden que no encaje en las etapas conocidas.
- El contador de "activas" pasará a contar exactamente las tarjetas visibles, y se excluyen las ya despachadas del listado activo.

**C. Que no se salten fases**
- Al finalizar una etapa: si la etapa actual no está en el flujo de la orden, se reconstruye el flujo correcto en vez de saltar al inicio; nunca se avanza a una etapa vacía.
- Reparar los flujos guardados inconsistentes (alinear el arreglo de etapas con "necesita cuerpos" y con el tipo de producto) sin tocar las órdenes ya cerradas.
- Registrar cada cambio de etapa en el historial de procesos existente, incluyendo saltos, para tener trazabilidad de quién movió qué.

**D. Estampación coherente**
- Estampación solo verá órdenes cuyo flujo incluya estampación (es decir, con logo) más las que estén en la etapa de estampación.
- Cuando una orden pase de cuerpos directo a la siguiente fase porque estampación ya terminó, quedará marcada como "estampación completada" en la tarjeta en vez de desaparecer.

## Detalle técnico

- `src/lib/orderFlow.ts`: guardar `order_code` en `ensureProductionOrder`; helper `normalizeStages(order)` que recalcula el flujo válido a partir de marca, logo, `needs_cuerpos` y tipo de producto.
- `src/hooks/useProductionOrders.ts` (`advanceStage`): usar `normalizeStages` cuando `stages.indexOf(current_stage) === -1`; validar que `nextStage` exista antes del update; persistir el flujo corregido en la misma actualización.
- `src/components/production/MagicalWarmersWorkflow.tsx` y `SweatspotWorkflow.tsx`: excluir `despachado` de activas, bloque "Otras etapas" con las órdenes no clasificadas, contador derivado de las tarjetas renderizadas.
- `src/components/production/EstampacionProductionView.tsx`: filtro por `stages.includes("estampacion")`; badge "Estampación finalizada" en órdenes adelantadas.
- Nuevo componente `UnroutedOrdersPanel.tsx` (pedidos aprobados sin `production_orders`), montado en Inventarios y en Producción.
- Datos: completar `order_code` faltante y normalizar el arreglo `stages` de las órdenes activas inconsistentes (solo no cerradas).

Sin cambios en RLS: los permisos de lectura de Producción, Estampación e Inventarios ya son correctos.
