# Recompras: logos con flujo completo, notificaciones y trazabilidad

## Situación actual (verificada en el código)

- En Magical y Sweatspot, al activar **Recompra** el sistema muestra el aviso "El logo ya existe, no se generará solicitud de diseño automática" y salta la creación de la solicitud de diseño (`Ventas.tsx` omite `createLogoRequestFromOrder` cuando `isRecompra`).
- Si el asesor adjunta un archivo nuevo en una recompra, el archivo se sube al storage y se guarda la URL en el pedido, pero **no se crea solicitud de diseño ni se notifica a Diseño/Estampación**: por eso el equipo termina pidiendo el archivo por WhatsApp.
- En Sweatspot la recompra ni siquiera ofrece elegir un logo anterior.
- No hay registro de si el logo fue reutilizado o actualizado, ni de quién lo cargó y cuándo.

## Qué se va a construir

### 1. Pregunta explícita en el pedido

Al activar **Recompra** (Magical y Sweatspot) aparece la pregunta:

> ¿El cliente utilizará el mismo logo?  ( ) Sí   ( ) No

- **Sí** → el asesor selecciona el logo anterior con el buscador inteligente ya existente (búsqueda por cliente, marca, producto o nombre del logo, con vista previa de imágenes y PDFs). Obligatorio elegir uno.
- **No** → se habilita la carga de archivos (uno o varios logos, mismo componente que en pedidos nuevos) y campos de nombre/instrucciones. Obligatorio adjuntar al menos un archivo.

Se elimina el mensaje que dice que en recompra no se genera solicitud de diseño y se reemplaza por el estado real de cada caso.

### 2. Flujo según la respuesta

- **Mismo logo (reutiliza):** no se crea solicitud de diseño, el pedido conserva las etapas normales (incluida Estampación) y se notifica a Estampación que el pedido usa un logo ya aprobado, con enlace al archivo.
- **Logo nuevo (actualiza):** se crea la solicitud de diseño igual que en un pedido nuevo, marcada como recompra, y el pedido sigue el flujo completo de aprobación → estampación → producción. Nunca se salta ninguna etapa por ser recompra.

### 3. Notificaciones automáticas

- Logo nuevo: notificación a **Diseño** ("Recompra con logo actualizado — nueva solicitud") y a **Estampación** ("Pedido de recompra con logo NUEVO, no use el archivo anterior"), ambas con el número de pedido y el cliente.
- Logo reutilizado: notificación a **Estampación** ("Recompra con el mismo logo — archivo disponible en el pedido").

### 4. Trazabilidad

Cada pedido registra el origen del logo: reutilizado, actualizado o sin logo, junto con fecha y usuario. Ese historial se ve en:

- La tarjeta del pedido en **Mis Pedidos** (asesor).
- Las tarjetas de **Estampación** y **Diseño**, con una etiqueta clara: "Logo reutilizado" (gris) o "Logo NUEVO" (ámbar).
- El historial de cambios del pedido, con fecha y usuario.

## Detalles técnicos

- Migración: agregar a `orders` las columnas `logo_source` (`reutilizado` | `nuevo` | `sin_logo`), `logo_source_at` y `logo_source_by` (+ nombre), con valor por defecto derivable; y a `logo_requests` una marca `from_recompra`.
- `src/pages/Ventas.tsx`: nuevo estado `recompraMismoLogo` (Magical y Sweatspot) persistido con el resto del borrador; reestructurar la rama de recompra del submit para que, cuando el logo sea nuevo, llame a `createLogoRequestFromOrder` (mismo camino que un pedido nuevo) en lugar de la subida directa.
- `LogoSearchDialog` / `useLogoSearch` (ya existentes) reemplazan el `Select` de "logo anterior" en Magical y se agregan a Sweatspot.
- Notificaciones vía `notifications` con `target_role` `disenador` y `estampacion`, tipo `diseno_logo` / `nuevo_pedido`, referenciando el `order_id`.
- Registro en `order_change_log` con campo `logo` (valor anterior/nuevo y motivo "recompra"), aprovechando `logOrderChange` y los paneles de historial existentes.
- `EstampacionProductionView.tsx`, `MisPedidos.tsx` y las vistas de Diseño leen `logo_source` para mostrar la etiqueta.
- Se mantiene la compatibilidad con los campos actuales (`logo_url`, `logo_url_2`, `logos`, `logo_count`); los pedidos históricos siguen funcionando.
