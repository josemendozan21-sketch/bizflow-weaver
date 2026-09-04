# Pedidos que no llegan a Diseño

## Qué encontré (verificado en la base de datos)

1. **El pedido de Karen Quevedo (MW-PB-01122) sí llegó a Diseño.** Su solicitud existe, la trabajó Lina García y quedó **Aprobado** el 31 de agosto. Por eso hoy no aparece en la bandeja de la diseñadora: ya salió de sus pestañas de trabajo. Lo que sigue detenido es el pedido en Producción (lleva en "Pendiente" desde el 28 de agosto).

2. **Las recompras nunca crean solicitud de diseño.** Hoy el sistema omite a propósito la solicitud cuando el pedido se marca como recompra. Resultado: **13 pedidos desde el 1 de agosto** tienen logo adjunto y ninguna solicitud en Diseño (Carmelo Capadicasa, Camila Echeverry x2, Dra Sandra Parra, Dermo Angel, Diana Rubio, Pulpo Lab, CEI Medical Group, Dr Beiby Pérez, Dr Manuel Moreno, Unitraumax, Dra Victoria León, Benavides). Varios siguen en "Pendiente". Si el cliente manda un logo nuevo o pide un cambio (otro molde, otro tamaño), nadie en Diseño lo ve.

3. **Ninguna solicitud queda enlazada a su pedido.** Las 318 solicitudes tienen el campo de pedido vacío, aunque el código intenta guardarlo. Por eso Diseño no ve el número de pedido y no se puede saltar de una vista a otra. Falta confirmar la causa exacta (permisos o momento en que se guarda) antes de corregir.

## Qué se va a hacer

### 1. Recompras que sí requieren diseño
- Al crear una recompra, distinguir tres casos: reutiliza el logo tal cual, trae logo nuevo, o pide un ajuste sobre el logo anterior.
- En los dos últimos casos se crea solicitud de diseño marcada como recompra, con el logo anterior de referencia y la nota del asesor.
- Si el asesor escribe una personalización o instrucción (como "ya está en la empresa, pero ahora va en círculos"), se crea la solicitud aunque no suba archivo.
- Aplica igual en Magical Warmers y Sweatspot.

### 2. Enlace solicitud–pedido
- Diagnosticar por qué el enlace no se guarda y corregirlo, de modo que cada solicitud muestre su número de pedido y el asesor pueda abrir la ficha desde Diseño.

### 3. Panel de control para detectar estos casos
- Nueva tarjeta en Diseño: "Pedidos sin solicitud de diseño", que lista pedidos con logo o personalización que no tienen solicitud asociada, con botón para generarla en un clic.
- Así ningún pedido vuelve a quedar invisible, incluso si el flujo automático falla.

### 4. Regularizar los 13 pedidos pendientes
- Crear las solicitudes faltantes para los pedidos que aún no están despachados, dejando registro de que se generaron por corrección. Los ya despachados solo se listan como informativos, sin crear trabajo nuevo.

## Detalle técnico

- `src/pages/Ventas.tsx` (Magical y Sweatspot): reemplazar la condición `!reusaLogoAnterior` por una decisión explícita (`logoSource` + presencia de archivo/personalización) y llamar a `createLogoRequestFromOrder` con `fromRecompra: true` y `original_logo_url` del logo anterior cuando aplique.
- `src/lib/createLogoRequestFromOrder.ts`: aceptar `orderId` y `previousLogoUrl`; insertar `order_id` en el INSERT en vez del UPDATE posterior (evita el fallo actual). Donde el pedido aún no existe, mantener el UPDATE pero con manejo de error visible.
- Verificar con una consulta si el UPDATE de `order_id` es bloqueado por RLS (`Advisors can update logo requests`) antes de decidir la corrección definitiva.
- Nuevo componente `src/components/diseno/PedidosSinSolicitud.tsx`: consulta de `orders` con logo/personalización sin `logo_requests` relacionado (por `order_id` o `original_logo_url`), integrado en `src/pages/DisenoLogos.tsx`.
- Regularización de los 13 pedidos vía inserciones puntuales, sin tocar datos históricos de pagos ni comisiones.
- Sin cambios de esquema ni de RLS salvo lo que confirme el diagnóstico del punto 3.
