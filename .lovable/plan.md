# Entregas parciales de pedidos

Permitir registrar entregas por partes en pedidos grandes (ej. MW-AM-01095: 1.000 unidades, 500 ya entregadas) con descuento automático sobre el total y seguimiento visible en todas las áreas.

## Cómo funcionará

1. **Registrar entrega parcial**: en Logística (y en el buzón de Inventarios) cada pedido tendrá un botón "Registrar entrega parcial" donde se indica: cantidad entregada, fecha, quién entrega y una nota opcional. El sistema valida que no se pueda entregar más de lo pendiente.
2. **Descuento automático**: el pedido guarda "entregado" y "pendiente" calculados. Al registrar 500 sobre 1.000 queda 500 pendientes; cuando el acumulado llega al total, el pedido pasa automáticamente a despachado/entregado con su fecha.
3. **Historial**: cada pedido muestra la lista de entregas registradas (fecha, cantidad, responsable, nota), con opción de eliminar una entrega mal registrada (Admin/Inventarios/Logística), lo que devuelve el saldo pendiente.
4. **Visibilidad en todas las áreas**: en las tarjetas de Ventas (Mis pedidos), Producción, Estampación, Inventarios, Logística y Contabilidad se agrega una barra/etiqueta "500 / 1.000 entregadas · faltan 500" junto al número de pedido.
5. **Filtros**: nuevo filtro "Entrega parcial" en Logística e Inventarios para ver rápidamente los pedidos con entregas incompletas.
6. **Exportes**: las descargas de pedidos incluyen las columnas Entregado y Pendiente.

No se cambia la lógica actual de pedidos, producción ni facturación: es una capa adicional de seguimiento.

## Detalle técnico

- Migración: nueva tabla `public.order_deliveries` (order_id, quantity, delivered_at, delivered_by, delivered_by_name, notes, timestamps) con GRANTs, RLS (lectura para usuarios autenticados; escritura para admin, inventarios, logistica, produccion) y trigger `recalc_order_delivered()` que actualiza en `orders` dos columnas nuevas: `delivered_quantity` (default 0) y `pending_quantity` generada/derivada, marcando `production_status='despachado'` y `dispatched_at` cuando `delivered_quantity >= quantity`.
- Validación en trigger (no CHECK constraint) para impedir sobre-entrega.
- Hook `useOrderDeliveries` (query + mutaciones create/delete con invalidación de `orders`).
- Componente `PartialDeliveryDialog.tsx` y `DeliveryProgressBadge.tsx` (reutilizable, junto a `OrderCodeBadge`).
- Integración de `DeliveryProgressBadge` en: `MisPedidos.tsx`, `Logistica.tsx`, `WholesaleOrdersInbox.tsx`, vistas de producción/estampación y paneles de contabilidad.
- Backfill opcional: registrar la entrega de 500 unidades ya realizada del pedido MW-AM-01095 (confirmar fecha).
