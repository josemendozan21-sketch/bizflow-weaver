# Numeración de pedidos + correcciones del flujo de asesores

## 1. Numeración consecutiva de pedidos (transversal)

Hoy los pedidos solo se identifican por un ID técnico (UUID) que nadie puede leer ni buscar. Se agrega un número consecutivo legible, sin cambiar nada de la lógica actual.

- Cada pedido recibe un consecutivo automático al crearse y un código visible tipo `BN-00123`.
- Se numeran también los pedidos históricos, en orden de fecha de creación (el más antiguo recibe el 1).
- Cuando un pedido de un mismo cliente se divide en varias líneas (por color de gel, tinta, referencia), todas comparten el mismo grupo y se muestran como `BN-00123 · línea 2 de 4`, para que ningún área crea que faltan unidades.
- El código aparece y se puede buscar/filtrar en: Ventas (Mis pedidos, Comisiones), Inventarios (bandeja de pedidos, entradas/salidas, solicitudes), Producción, Estampación, Logística/Despachos, Contabilidad (facturación, cartera, caja) y en las exportaciones a Excel.
- Las notificaciones y los diálogos de confirmación incluyen el código.

## 2. Segundo logo por pedido

- En el formulario del asesor se agrega "Cantidad de logos" (1 o 2), con el mismo comportamiento de "Número de tintas": al elegir 2 se habilita el segundo bloque (archivo + nombre/referencia del logo 2).
- El segundo logo se guarda junto con el pedido y se envía a Diseño en la misma solicitud, para que Diseño y Estampación vean ambos archivos.
- Validación: si son 2 logos, ambos archivos y nombres son obligatorios.

## 3. Pérdida de configuraciones cuando hay varios geles/tintas

- Primero se verifica con datos reales por qué en algunos pedidos solo queda la primera configuración (revisión de pedidos recientes con varias líneas y de los rechazos por la regla anti-duplicados, que compara cliente + producto + cantidad).
- Cada línea con configuración distinta (gel, tinta, escarcha, tipo) se guarda como un pedido independiente del mismo grupo; solo se suman las líneas exactamente iguales.
- Si alguna línea no se guarda, el asesor recibe un aviso bloqueante con el detalle exacto de la línea perdida en vez de un mensaje genérico, y el resumen final confirma cuántas líneas quedaron guardadas (por ejemplo "4 de 4 líneas guardadas").
- En Inventarios y Estampación se muestra el grupo completo del pedido con sus líneas y colores, para verificar de un vistazo las 200 unidades repartidas en 4 configuraciones.

## 4. Recompras: el logo ya no se pierde

- En recompra, el asesor debe indicar el logo: seleccionar uno de los logos ya aprobados de ese cliente (lista traída de Diseño) o adjuntar el archivo.
- Ese logo queda guardado en el pedido, de modo que Estampación lo vea aunque la recompra no genere solicitud de diseño nueva.
- Estampación deja de ocultar las recompras: los pedidos marcados como recompra con logo asociado entran a la bandeja igual que los demás.

## Detalles técnicos

- Migración en `orders`: `order_number bigint` (secuencia + default), `order_code text` generado (`BN-` + número con relleno), `group_number bigint`, `line_index int`, `line_count int`, `logo_count int default 1`, `logo_url_2 text`, `logo_name`, `logo_name_2`. Backfill de `order_number`/`order_code` por `created_at`; índices en `order_number`, `order_code`, `group_number`, y trigger que asigna `group_number` desde `submission_id`.
- Migración en `production_orders` y `logo_requests`: columnas espejo `order_code`, `original_logo_url_2` para propagar el número y el segundo logo.
- `src/pages/Ventas.tsx`: bloque "Logos" (1/2) análogo a "Tintas de marcación"; envío de `line_index`/`line_count`; selector de logo previo para recompra; resumen de confirmación con líneas y códigos.
- `src/lib/orderFlow.ts` / `createLogoRequestFromOrder`: soporte de segundo archivo y del código de pedido.
- Vistas actualizadas para mostrar/buscar el código: `MisPedidos.tsx`, `MisComisiones.tsx`, `WholesaleOrdersInbox.tsx`, `EstampacionProductionView.tsx`, vistas de producción, logística, contabilidad y utilidades de exportación (`accountingExports.ts` y exports de comisiones).
- `EstampacionProductionView.tsx`: incluir en `pendingIntake` los pedidos `is_recompra` con `logo_url`, sin depender de `logo_requests` aprobadas.
- No se modifica la lógica de estados, comisiones, descuentos de inventario ni de producción: solo se añade identificación y trazabilidad.
