# Desbloquear la entrega de cuerpos a Estampación

Hoy Inventario no puede entregar porque el sistema exige que la muestra esté aprobada antes de cualquier entrega. Pero Estampación necesita cuerpos justamente para hacer la muestra: el pedido queda atascado entre las dos áreas.

Hoy hay 46 pedidos al por mayor pendientes en ese estado ("Pendiente de muestra") y solo 1 con muestra aprobada.

## Qué se cambia

1. **"Enviar a Estampación" y "Salir kit" dejan de estar bloqueados.**
   Mandar cuerpos a Estampación es el paso previo a la muestra, así que Inventario puede hacerlo siempre. En vez del aviso rojo de bloqueo, la tarjeta dirá: "Pendiente de muestra — envía los cuerpos para que Estampación la prepare".

2. **"Solicitar Producción" tampoco se bloquea.**
   Producir cuerpos es anterior a la muestra; no tiene sentido frenarlo.

3. **Se mantiene el bloqueo donde sí corresponde.**
   Las entregas que cierran el pedido — "Entregar termos (marcar)" en Sweatspot y la entrega a Logística de producto terminado — siguen exigiendo muestra aprobada, con el mismo aviso y la excepción de administrador. Así se conserva la regla original: nada sale al cliente sin muestra aprobada.

4. **La etiqueta del estado de muestra se queda** en la tarjeta, para que Inventario vea en qué punto va cada pedido.

## Detalles técnicos

- `WholesaleOrdersInbox.tsx`: separar `sampleBlocked` en dos condiciones — `sampleBlocksFinalDelivery` (usada en `openDeliver(o,"terminado")` y en la entrega a logística) y ningún bloqueo para los targets `estampacion` y `produccion`; quitar `disabled={... || sampleBlocked}` y el `title` de esos botones.
- Cambiar el bloque de aviso (líneas ~791-796) por un texto informativo cuando el pedido está pendiente de muestra y la acción disponible es enviar a Estampación.
- No se tocan datos: `sample_status` sigue igual y lo sigue actualizando Estampación al aprobar la muestra.
