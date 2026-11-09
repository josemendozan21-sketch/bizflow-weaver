# Producto terminado que se aparta solo para pedidos con logo del cliente

## Qué pasó
- El 4 de noviembre, Inventarios dio entrada a 103 Gafas pequeñas (producto terminado, marcado). Ese mismo día salió 1 para un pedido al detal (Andrea Mejía).
- Horas después, Ángela registró el pedido mayorista MW-AM-01595 (Nicole López, 150 gafas con logo nuevo del cliente). El sistema apartó solo las 102 restantes para ese pedido, así que el disponible quedó en 0.
- Pasa con todos los productos terminados: cada pedido nuevo aparta automáticamente lo que haya disponible de esa referencia, sin importar si el pedido lleva logo propio del cliente. Hoy hay 28 reservas así (933 unidades) en pedidos mayoristas con logo nuevo.
- Las reservas nunca se cierran: 95 pedidos ya despachados siguen figurando con 1.220 unidades apartadas. Eso infla la columna "en proceso".

## Regla nueva (confirmada)
Los pedidos con logo nuevo del cliente **no apartan producto terminado**: se producen desde cuerpos. Los pedidos al detal y los mayoristas sin logo propio siguen apartando producto terminado como hoy.

## Cambios
1. **Reserva automática:** si el pedido es mayorista con logo nuevo, el sistema no toma producto terminado. El requerimiento apunta a la referencia de cuerpos, para que Inventarios vea cuántos cuerpos faltan.
2. **Devolver lo apartado por error:** en los pedidos con logo nuevo que todavía no se han despachado, se liberan las reservas de producto terminado y las unidades vuelven a "Disponible". Las 102 gafas de MW-AM-01595 vuelven así a disponible. Antes de liberar se muestra la lista de pedidos y unidades afectados.
3. **Cerrar reservas de pedidos despachados:** se marcan como usadas, para que "en proceso" deje de mostrar unidades apartadas de pedidos ya entregados. No se modifica el disponible.
4. **Mostrar lo reservado:** en Producto terminado se agrega la columna "Reservado", con el detalle de qué pedido tiene apartadas las unidades, para que Inventarios entienda por qué no hay stock.

## Detalles técnicos
- `create_order_requirement`: si `sale_type='mayor'` y `logo_source='nuevo'`, buscar solo `category='cuerpos_referencias'` y no reservar `producto_terminado`.
- Liberación por datos: se usa `release_order_reservation` en las reservas activas de producto terminado de pedidos mayor/nuevo no despachados. Para pedidos despachados: `status='consumida'`, `consumed_at`, y se baja `in_process` sin tocar `available`.
- Además, se agrega en la función de despacho que la reserva pase a consumida, para que no vuelva a acumularse.
- Vista de Producto terminado: suma de reservas activas por `stock_item_id` y su detalle por pedido.
