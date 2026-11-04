# Recompras con ajuste de logo: que Producción no pueda revelar hasta que Diseño apruebe

## Qué encontré en MW-PB-01577 (Lina Sora / Ana Milena Espitia)
- El pedido **no quedó marcado como recompra** en el sistema: está como pedido con logo nuevo.
- La solicitud a Diseño ("modificar el número de teléfono 3103192663") existe y sigue **en revisión**, sin aprobar.
- Aun así, la orden de Producción se creó **56 minutos después** de la venta y Estampación pudo avanzar. O sea: el sistema dejó pasar a Producción un pedido con el logo todavía en Diseño.

Riesgos generales que también vi:
- Las recompras que reutilizan logo entran a Estampación directo, aunque tengan un ajuste abierto.
- Estampación busca la solicitud de diseño por **nombre del cliente**, así que una solicitud vieja ya terminada puede contar como "aprobada".
- En la tarjeta de Producción no aparece ningún aviso de "Ajuste de logo".

Primer paso: confirmar por dónde se habilitó exactamente este pedido (si Producción no vio el logo como pendiente o si la orden se creó sin revisar Diseño).

## Qué cambia
1. **Bloqueo:** si un pedido (recompra o no) tiene una solicitud de diseño **abierta**, no entra a Estampación ni se puede iniciar el revelado ni la muestra de gel hasta que Diseño la apruebe.
2. **Aviso visible:** en la tarjeta de Producción, junto a "Recompra", aparece una etiqueta roja **"Ajuste de logo en Diseño — no revelar"**, con el comentario de la asesora.
3. **Logo correcto:** al aprobarse el ajuste, Producción usa el logo ajustado, no el anterior.
4. **Interruptor más claro en Ventas:** en recompras, la opción "¿Requiere ajuste del logo?" queda visible y obligatoria de responder (Sí/No) en Magical y Sweat Spot, para que el ajuste no quede solo en comentarios.
5. **Pedidos en curso:** reviso las recompras activas con solicitud de ajuste abierta y te digo cuáles ya están en Estampación, sin cambiar nada sin tu visto bueno.

## Detalles técnicos
- `EstampacionProductionView.tsx`: el filtro de entrada (`is_recompra && logo_url`) se condiciona a que no exista `logo_requests` abierta con `order_id` del pedido (o del mismo `submission_id`/grupo); `matchingLogo` se busca primero por `order_id` y solo cae al nombre si no hay enlace, ignorando solicitudes anteriores al pedido.
- `logoApproved` = falso mientras haya solicitud enlazada no aprobada/finalizada; botones de revelado/gel deshabilitados con el motivo.
- Ventas (MW y SS): `logo_source` sigue "reutilizado", pero se guarda la marca de ajuste en las observaciones de Producción y se exige elegir Sí/No.
- Prueba unitaria pequeña para la regla "solicitud abierta ⇒ no puede iniciar estampación".
