# Abastecimiento automático: orden → inventario → producción

Cuando un asesor crea una orden, el sistema calcula automáticamente cuánto hay en inventario de esa referencia y cuánto falta producir. Lo disponible se separa para la orden y el faltante se acumula en una orden de producción unificada por referencia. Inventario siempre da la confirmación final antes de mover el stock.

## Flujo propuesto

```text
Asesor crea orden (100 termos 250 ml negro c/correa)
        v
Sistema calcula requerimiento por referencia exacta
  (marca + referencia + tipo Frío/Térmico + color + logo)
        v
Inventario ve "Requerimiento": disponible 50 / faltante 50
        v
Inventario CONFIRMA -> descuenta 50 del stock (queda trazado)
        v
Faltante 50 -> se suma al lote abierto de esa referencia
        v
Producción ve un lote acumulado (50 + 20 + 15 = 85)
        v
Producción pulsa INICIAR -> el lote se cierra
   (lo que entre después va a un lote nuevo)
        v
Producción FINALIZA y declara unidades reales producidas
        v
Inventario recibe y CONFIRMA la recepción (doble verificación)
        v
Stock actualizado automáticamente + trazabilidad completa
```

## Qué se construye

### 1. Requerimientos por orden
- Al crear una orden (mayor o detal, Sweatspot y Magical, producto terminado y cuerpos) se generan automáticamente las líneas de requerimiento con la referencia exacta.
- Cada línea muestra: cantidad pedida, disponible en inventario, cubierto y faltante.
- Nada se descuenta hasta que inventario confirme (según lo definido).

### 2. Panel de Inventario: "Requerimientos de órdenes"
- Lista de líneas pendientes, agrupadas por orden con su número de pedido visible.
- Botón "Confirmar disponible": descuenta lo que hay y registra el movimiento de inventario.
- El faltante pasa automáticamente al lote de producción de esa referencia.
- Si al confirmar el stock cambió, se recalcula y avisa.

### 3. Lotes de producción unificados
- Nuevo concepto de "lote": agrupa el faltante de varias órdenes de la misma referencia (misma marca, tipo, color y logo).
- Un lote está "abierto" mientras producción no lo inicie; todo faltante nuevo cae ahí.
- Botón **Iniciar** en producción: cierra el lote (deja de recibir nuevas órdenes), marca hora de inicio y responsable.
- Lo que entre después crea automáticamente un nuevo lote abierto.
- Cada lote muestra el detalle de qué órdenes lo componen.

### 4. Confirmación de producción + doble verificación de inventario
- Producción pulsa **Finalizar** e ingresa las unidades realmente producidas (pueden diferir del objetivo).
- El lote queda "pendiente de recepción" y llega alerta a Inventario.
- Inventario confirma la recepción (puede ajustar la cantidad recibida): solo en ese momento se suma al stock.
- Se evita cualquier doble suma: una sola ruta de escritura al inventario, con marca de "recepción ya confirmada".

### 5. Historial y alertas
- Historial del lote: creado, órdenes incluidas, iniciado (quién y cuándo), finalizado, recibido, cantidades objetivo vs. producidas vs. recibidas.
- Se integra al panel de "Historial de cambios" ya existente (mismo componente compartido) en Producción e Inventarios.
- Notificaciones: a Inventario cuando falta stock y cuando producción finaliza; a Producción cuando entra un nuevo faltante.

## Detalles técnicos

- Nuevas tablas: `order_requirements` (línea por orden+referencia, con cantidades requerida/cubierta/faltante y estado) y `production_batches` + `production_batch_items` (lote por referencia con estados `abierto → en_proceso → finalizado → recibido`, timestamps y usuarios de inicio/fin/recepción).
- Clave de agrupación normalizada: `brand + referencia canónica + product_type + color + logo`, reutilizando `src/lib/referenceCatalog.ts` para no duplicar variantes.
- Trigger `AFTER INSERT` en `orders` que genera las líneas de requerimiento resolviendo el `stock_item_id` por esa clave; convive con `auto_create_retail_inventory_request` sin duplicar descuentos.
- Función de base de datos para "confirmar disponible" (descuenta vía `inventory_movements`, ruta única ya existente) y otra para "confirmar recepción" (suma stock una sola vez, idempotente).
- Índice parcial único que garantiza un solo lote abierto por clave de referencia.
- RLS: lectura para inventarios/producción/admin/visualizador; escritura acotada por rol y acción (iniciar/finalizar = producción; confirmar = inventarios/admin).
- Frontend nuevo: `useOrderRequirements.ts`, `useProductionBatches.ts`, `OrderRequirementsPanel.tsx` (Inventarios), `ProductionBatchesPanel.tsx` (Producción) y `BatchReceptionPanel.tsx` (Inventarios), con `OrderCodeBadge` y `ReferenceLabel` para consistencia.
- Los flujos actuales (estampación, entregas parciales, solicitudes existentes) no cambian de lógica; esto se añade encima.
