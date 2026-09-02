# Fotos de aprobación por producto (pedidos multi-producto)

## Qué encontré (verificado en datos reales)

Cuando el asesor agrega varios productos en un mismo pedido, el sistema **ya crea una línea por producto** (mismo cliente, mismo envío) y **una orden de producción por línea**. Ejemplo real: cliente "Juliana Marcela Vera FENDESA", 2 líneas de Gafas grandes (Frío) — gel Azul claro (MW-PB-01146) y gel Morado (MW-PB-01147) — cada una con su propia orden de producción y **su propia foto de tamaño** ya cargada.

Entonces la limitación no es que solo se pueda subir una foto: es que **en pantalla no se distingue a qué producto pertenece cada tarjeta ni cada foto**:

- En Estampación, la tarjeta muestra solo el nombre del cliente y la marca en el encabezado. Dos líneas del mismo cliente se ven idénticas, sin número de pedido ni "Producto 1 / Producto 2", así que se sube la foto "a ciegas".
- En la vista del asesor (Aprobaciones de estampación), las aprobaciones se **agrupan por cliente + marca + paso + foto**, y al aprobar/rechazar se aplica a todas las líneas del grupo. No hay etiqueta de producto/color, ni un resumen que muestre "faltan fotos de 1 de 2 productos".
- No hay ninguna vista que muestre el pedido completo con su avance por producto.

## Qué se va a construir

### 1. Identificación por producto en Estampación
- Cada tarjeta muestra en el encabezado: número de pedido, etiqueta **Producto N de M** del mismo pedido/cliente, referencia y el color diferenciador (gel/tinta/escarcha/silicona).
- Los pasos de foto quedan rotulados con ese contexto ("Paso 1 · Producto 2 · Gafas grandes · Gel Morado"), y la vista previa de la foto se muestra junto al producto correspondiente.
- Agrupación visual: las líneas del mismo pedido aparecen juntas bajo un bloque del pedido, con un contador "Fotos cargadas 1/2" para que no se olvide ninguna.

### 2. Aprobaciones del asesor por producto
- Se elimina la fusión ciega por cliente: cada producto tiene su propia tarjeta de aprobación con número de pedido, producto, color, cantidad y su foto.
- Se agrupan bajo el pedido (mismo cliente/envío) mostrando "2 de 2 productos por aprobar", pero aprobar/rechazar actúa por producto.
- Se mantiene un botón opcional "Aprobar todos los productos de este pedido" cuando el asesor quiera hacerlo de una.
- El comentario de rechazo queda ligado al producto rechazado, y Estampación solo debe volver a subir la foto de ese producto.

### 3. Bloqueo de avance incompleto
- Estampación no puede finalizar una línea sin su propia foto aprobada (ya funciona así por línea) y, adicionalmente, se muestra una alerta en el bloque del pedido si quedan productos sin foto o sin aprobación.

### 4. Visibilidad del pedido completo para el asesor
- En Mis Pedidos, cada pedido multi-producto muestra el estado de estampación por producto (foto pendiente / esperando aprobación / aprobada / rechazada), con la miniatura de la foto de cada uno.

## Detalles técnicos

- No requiere cambios de base de datos: `production_orders` ya guarda `stamp_size_photo_url`, `stamp_inkgel_photo_url` y sus estados por línea; el agrupamiento del pedido se hace con `orders.submission_id` (y `order_code`), consultado junto a `order_id`.
- Archivos a tocar:
  - `src/components/production/EstampacionProductionView.tsx`: encabezado de tarjeta con `OrderCodeBadge`, índice de producto, referencia y color; agrupación por `submission_id`; contador de fotos.
  - `src/components/ventas/StampingApprovals.tsx`: reemplazar la clave de agrupación `marca|cliente|paso|foto` por tarjetas por orden de producción, agrupadas visualmente por pedido; acción "aprobar todo el pedido" opcional.
  - `src/components/ventas/MisPedidos.tsx`: bloque de estado de estampación por producto.
  - Se agrega un pequeño hook/consulta que trae `submission_id`, `product`, `gel_color`, `ink_color`, `line_index` de `orders` para las órdenes de producción visibles.
- Datos históricos: las líneas ya existentes conservan sus fotos; solo cambia cómo se muestran y aprueban.
