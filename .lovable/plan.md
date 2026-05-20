
## Objetivo

Quitar las tareas automáticas de "Producción de cuerpos" que se están generando por cada pedido, y reemplazarlas por:
- Un **panel de cuerpos requeridos** (agregado por referencia + tipo de plástico) calculado en vivo desde los pedidos de producción activos, ordenado por urgencia.
- El **registro manual** de producción de cuerpos que ya existe (botón "Producción de cuerpos") sigue siendo la única vía para crear tareas — el encargado decide qué montar y cuándo.

## Cambios

### 1. Eliminar generación automática y tareas existentes
- Quitar la función de DB `auto_create_body_task_for_production_order` (y `auto_create_body_task_on_low_stock`) — ya no se crearán tareas automáticas a partir de órdenes ni de bajo stock.
- Borrar todas las filas `pendiente` / `en_proceso` actuales de `body_production_tasks` que NO tengan `completed_at` (las finalizadas se conservan para histórico).
- En `MagicalWarmersWorkflow.tsx`: quitar el bloque "Producción de cuerpos (N activas)" con `BodyTasksGrouped` y el diálogo de confirmación de cantidad. Se mantiene el bloque colapsado de "cuerpos completados" para historial.

### 2. Nuevo panel "Cuerpos requeridos"
Se agrega encima de "Órdenes de producción" un panel que:
- Recorre todas las órdenes activas (`current_stage !== "listo"`) de Magical con `needs_cuerpos = true`.
- Filtra solo referencias producibles (Magical canónicas + termos Sweatspot 150/250/500/juguetón) usando el helper `isProducibleReference` ya existente.
- Agrupa por `(molde, tipo_plástico)` deduciendo el tipo desde el texto del molde (`calor` si contiene "calor", de lo contrario `frio`).
- Para cada grupo calcula:
  - Total de unidades requeridas (suma de `quantity`).
  - Stock disponible actual (`body_stock` de Magical para esa referencia).
  - Faltante = `max(0, requerido - disponible)`.
  - Fecha de entrega más próxima entre los pedidos del grupo.
  - Número de pedidos y lista de clientes.
- Ordena por urgencia:
  1. Faltante > 0 primero.
  2. Fecha de entrega más próxima.
  3. Mayor cantidad faltante.
- Cada fila muestra: referencia, tipo (Frío/Calor), requerido / disponible / faltante, próxima entrega + días restantes, badge de urgencia (rojo si ≤3 días o vencido, ámbar si ≤7, gris si más), botón "Producir esto" que pre-llena el formulario manual de producción de cuerpos con esa referencia, tipo y cantidad faltante.

### 3. Botón manual existente
- "Producción de cuerpos" sigue abriendo el formulario que ya existe (`BodyProductionForm`).
- Al recibir el prefill del panel, se abre con referencia/tipo/unidades sugeridas y el encargado puede ajustar.
- Al finalizar (cantidad real producida) sigue sumando a `body_stock` como hoy.

## Detalles técnicos

- **Migración SQL nueva** (timestamp): `DROP FUNCTION IF EXISTS public.auto_create_body_task_for_production_order() CASCADE;` y lo mismo para `auto_create_body_task_on_low_stock`. No hay triggers conectados según el esquema, pero las funciones se eliminan para evitar reactivación accidental.
- **Operación de datos** (tool de insert): `DELETE FROM public.body_production_tasks WHERE status IN ('pendiente','en_proceso');`
- **Componente nuevo**: `src/components/production/BodyRequirementsPanel.tsx` — recibe `orders: ProductionOrder[]`, `bodyStock`, y un callback `onProduceClick({ referencia, tipoPlastico, unidadesSugeridas })`.
- **Edición**: `src/components/production/MagicalWarmersWorkflow.tsx`
  - Remover `activeBodyTasks` / `BodyTasksGrouped` y su diálogo de confirmación de cantidad para tareas (se conserva el de órdenes en stage `produccion_cuerpos`).
  - Agregar estado `prefilledBody` que abre `BodyProductionForm` con valores iniciales.
  - Insertar `<BodyRequirementsPanel ... />` antes del listado de órdenes.
- `BodyProductionForm` acepta props opcionales `initialTipoPlastico`, `initialReferencia`, `initialUnidades`.

## Lo que NO cambia

- El flujo de las órdenes (etapas, finalización, envío a logística) queda igual.
- `body_stock` y su descuento desde `useInventory.reserveBodyStock` no se tocan.
- Sweatspot y la lógica de termos producibles se mantiene.
