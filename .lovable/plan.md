# Por qué esos pedidos no aparecen en Producción/Estampación

## Qué encontré (verificado en los datos)

Revisé los 8 pedidos de las capturas (CONFORPLAS x3, Edgareth Molina x3, Diana López CAPILTECH, la chocolatería). Los 8 están en el mismo estado: **siguen en la bandeja "Pendientes de revisión de inventario"** y todavía no tienen orden de producción creada. Por eso no existen ni en Producción ni en Estampación.

En el flujo actual el pedido solo llega a Producción/Estampación cuando Inventarios pulsa **"Enviar a Estampación"** o **"Solicitar Producción"** en esa bandeja. Mientras nadie pulse, el pedido queda ahí.

Hoy hay **15 pedidos** en esa situación, algunos desde hace días.

Detalle adicional: en los de CONFORPLAS el botón "Enviar a Estampación" aparece gris porque no hay inventario completo (200 de 333); en ese caso la única salida es "Solicitar Producción", y nadie la pulsó.

## Qué propongo (sin cambiar el flujo)

1. **Que Estampación vea lo que viene en camino.** Hoy el panel "Pedidos sin orden de producción — Esperando a Inventarios" solo existe en la pantalla de Producción. Lo agrego, en modo consulta, arriba de la vista de Estampación, para que sepan qué pedidos están detenidos en Inventarios y a quién reclamarle, en vez de pensar que se perdieron.
2. **Aviso más visible en la bandeja de Inventarios.** Cuando un pedido lleva más de 2 días sin rutear, la tarjeta se marca en ámbar/rojo con "Esperando ruteo · X día(s)", igual que en el panel de Producción. Hoy solo se envía una notificación silenciosa.
3. **Texto claro en la tarjeta bloqueada por stock parcial:** en vez de solo un botón gris, dirá "Inventario insuficiente (200 / 333) — usa Solicitar Producción para los faltantes", para que no quede la duda de qué hacer.
4. **Los 15 pedidos detenidos no se mueven automáticamente:** Inventarios decide uno por uno, como hoy. Si quieres, te paso la lista para que les avisen.

No se tocan cantidades, stock, ni las reglas de muestra/aprobación.

## Detalle técnico

- `src/components/production/EstampacionProductionView.tsx`: montar `<UnroutedOrdersPanel readOnly />` encima de las pestañas.
- `src/components/inventory/WholesaleOrdersInbox.tsx`: badge de antigüedad (`daysSince(created_at)` con umbrales 2 y 5 días) en la tarjeta; texto explicativo cuando `!enough`.
- Sin migraciones ni cambios de datos.

## Verificación

- Confirmar que los 15 pedidos sin orden de producción aparecen listados en la vista de Estampación.
- Confirmar que las tarjetas de CONFORPLAS muestran el motivo del botón gris.
- Typecheck del proyecto.
