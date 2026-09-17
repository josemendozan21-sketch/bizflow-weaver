# Probar la conexión de inventario con la tienda web SweatSpot

Objetivo: comprobar, de punta a punta y sin alterar existencias, que la tienda web consulta y reserva inventario real de Bodega.

## Qué se va a probar

1. **Disponibilidad**: pedir varias referencias reales y verificar que devuelve el mismo disponible que muestra Bodega.
2. **Reserva**: reservar 1 unidad de una referencia con existencia; debe pasar de disponible a "en proceso" y devolver el identificador de la reserva.
3. **Reintento**: repetir la misma reserva con el mismo identificador externo; debe devolver la reserva existente sin descontar de nuevo.
4. **Sin existencias**: intentar reservar más de lo disponible; debe rechazarse sin mover nada.
5. **Confirmar**: confirmar una reserva y ver que la unidad sale definitivamente del inventario.
6. **Liberar**: liberar otra reserva y ver que la unidad vuelve a disponible.
7. **Expiración**: forzar el vencimiento de una reserva vieja y ver que vuelve sola a disponible.
8. **Seguridad**: llamar sin token y con token incorrecto; debe responder "no autorizado".
9. **Tiempo real**: comprobar que el panel de control por referencia refleja los cambios al instante.

## Estado final

Todas las unidades usadas en la prueba se confirman o liberan de forma que el inventario queda **exactamente igual** que antes de empezar. Se deja constancia del antes y el después de cada referencia tocada.

## Verificación del lado de la tienda web

Se revisa el proyecto de la página web para confirmar que:
- usa la misma dirección del servicio y el mismo token compartido;
- envía la clave de referencia estable (no el nombre del producto);
- reserva al iniciar el pago, confirma al aprobarse y libera si falla o se cancela.

Si algo no coincide, se reporta qué hay que ajustar allá (no se modifica ese proyecto desde aquí).

## Detalles técnicos

- Llamadas `POST` a la función `sweatspot-inventory` con cabecera `x-webhook-token`, probando `availability | reserve | confirm | release | expire`.
- Comparación antes/después con consultas a `stock_items` (`available`, `in_process`) y a `web_stock_reservations` (`external_id`, `status`, `expires_at`).
- Identificadores externos de prueba con prefijo `test-` para poder rastrearlos y limpiarlos.
- Prueba de expiración forzando `expires_at` en el pasado sobre una reserva de prueba y llamando `expire`.
- Al cerrar, las reservas de prueba quedan en estado final (`confirmada`/`liberada`) y se eliminan las filas de prueba creadas.

## Resultado esperado

Un reporte corto: qué operación se probó, qué respondió el servicio y cómo quedó el inventario, más la lista de ajustes pendientes en la tienda web si los hubiera.
