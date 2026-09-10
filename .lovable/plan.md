# Por qué reapareció MW-PB-00044 y cómo evitarlo

## Qué encontré (verificado en la base de datos)

- El pedido MW-PB-00044 (Ana Cristina Quintero) es del 21 de abril y ya está **despachado**.
- Su solicitud de logo nunca se cerró: quedó en "Listo para aprobación" desde entonces.
- Ayer 9 de septiembre, 19:22, Lina subió/actualizó el archivo ajustado en esa solicitud vieja. Eso la movió a "En revisión", y con el flujo nuevo ese estado significa "esperando al asesor". Por eso le apareció a Pilar de la nada.
- A las 19:44 Pilar la aprobó, así que hoy figura como "Aprobado".
- No es un caso aislado: hoy hay 3 solicitudes abiertas cuyos pedidos ya están despachados o en etapas avanzadas de producción, más 20 aprobadas que siguen ocupando la pestaña de Aprobación.

Causa de fondo: nada cierra la solicitud de logo cuando el pedido ya salió. Cualquier movimiento posterior sobre esa solicitud vieja la devuelve a la bandeja del asesor.

## Qué se va a ajustar

1. **Cerrar lo que ya salió**: marcar como finalizadas las solicitudes de logo cuyos pedidos ya están despachados, entregados o cancelados, incluida MW-PB-00044. No se borra nada: quedan visibles en la pestaña "Finalizados" con su historial.
2. **Cierre automático**: cuando un pedido pase a despachado, entregado o cancelado, su solicitud de logo se cierra sola. Así no puede volver a caer en la bandeja de nadie.
3. **Filtro en las bandejas**: Diseño y el asesor dejan de ver en "Diseñador" y "Aprobación" las solicitudes de pedidos ya despachados o cancelados. Si alguien abre una solicitud de un pedido ya despachado, verá un aviso claro de que ese pedido ya salió.
4. **Aviso al subir archivos**: si Lina sube un archivo a una solicitud de un pedido ya despachado, el sistema se lo advierte en lugar de mandarlo a aprobación.

## Lo que no cambia

- El flujo nuevo asesor → Diseño → aprobación → producción sigue igual para los pedidos activos.
- No se modifican logos, archivos, fechas ni pedidos históricos; solo se cierra el estado de las solicitudes de pedidos ya despachados.
- La aprobación que hizo Pilar ayer queda registrada en el historial.

## Alcance técnico

- Datos: `UPDATE logo_requests SET status='finalizado'` para las solicitudes con `order_id` cuyo pedido esté en `despachado`, `entregado` o `cancelado`, incluida la de MW-PB-00044.
- Migración: trigger `AFTER UPDATE` en `orders` que cierra las solicitudes abiertas al pasar a esos estados; queda registrado en `logo_request_status_log` con nota "Pedido despachado — solicitud cerrada automáticamente".
- Frontend: `useLogoRequests` traerá `orders.production_status`; `TrabajoDisenador`, `AprobacionAsesor` y los contadores de `DisenoLogos` excluirán los pedidos cerrados; `DesignerCard` mostrará el aviso cuando el pedido ya salió.

## Validación

- Confirmar que MW-PB-00044 desaparece de la bandeja de Pilar y aparece en Finalizados.
- Confirmar que las solicitudes de pedidos activos (por ejemplo, las de estampación y las pendientes) siguen visibles.
- Cambiar un pedido de prueba a despachado y verificar que su solicitud se cierra sola.
