# Flujo de logos al por mayor: asesor → diseño → producción

## Cómo quedará el proceso

1. El asesor crea la orden y adjunta el logo (uno o varios) y, si quiere, **archivos de referencia** opcionales (jpg, png, pdf) que sirven de guía y no reemplazan el logo.
2. La solicitud llega a Diseño en **Pendiente de diseño**.
3. Lina trabaja, sube el PDF y presiona un único botón: **Enviar al asesor para aprobación**. El asesor recibe notificación y el logo queda **En revisión**.
4. El asesor decide:
   - **Aprobar**: el logo queda aprobado y el pedido pasa a producción con el flujo actual.
   - **Solicitar modificación**: comentario obligatorio + archivos de referencia opcionales. Vuelve a Lina con notificación y queda **Ajustes solicitados**.
5. Cuando Lina reenvía después de un ajuste, el estado pasa a **Ajustado** (en revisión del asesor, segunda vuelta o más), para que el asesor distinguga a simple vista si es la primera versión o un ajuste. El ciclo se repite hasta la aprobación.

## Recompras

- Recompra con **el mismo logo y sin cambios**: no se crea solicitud de diseño; el pedido pasa directo a producción (se elimina el paso de reenvío al asesor).
- Recompra donde el cliente pide un ajuste sobre el logo existente: sí entra a Diseño, con el logo anterior como base y los archivos de referencia adjuntos.

## Archivos de referencia

- Se pueden subir al crear la orden y también en cada "Solicitar modificación".
- Visibles, previsualizables y descargables para Diseño y para el asesor dueño de la orden (y admin).
- Nunca sustituyen el logo original ni el ajustado.

## Historial dentro de la orden

- Cada envío a revisión, aprobación y solicitud de modificación (con su comentario y autor) queda registrado.
- Se muestra dentro del detalle de la orden, con el mismo componente de historial que ya se usa en la tarjeta de detalles del buscador de pedidos.

## Alcance técnico

- **Base de datos**: nueva tabla `logo_reference_files` (solicitud, orden, url, nombre, tipo, autor, etapa: creación / modificación) con permisos para diseñador, admin y el asesor dueño; los archivos van al bucket `logo-files` en la carpeta `references/`. Se aprovecha `logo_request_status_log` (ya existente) para el historial y se le añade la nota del asesor.
- **Diseño** (`TrabajoDisenador.tsx`): se elimina el selector de estados y el guardado manual; queda un botón "Enviar al asesor para aprobación" que decide `en_revision` (primera vez) o `ajustado` (tras ajustes solicitados), más el guardado de notas y del PDF. Se mantienen las correcciones de PDF (extensión/MIME, abrir y descargar).
- **Asesor**: "Aprobar diseño" habilitado en `en_revision` y `ajustado`; "Solicitar modificación" con comentario obligatorio y adjuntos opcionales; notificaciones en ambos sentidos.
- **Ventas** (`Ventas.tsx`, Magical y Sweatspot): campo opcional multi-archivo de referencias en el formulario de pedido; en recompra con mismo logo sin ajuste no se crea solicitud (`createLogoRequestFromOrder` no se invoca) y se notifica a producción/estampación.
- **Detalle de la orden** (`OrderDetailDialog.tsx`): panel de historial de diseño y lista de archivos de referencia.
- Los estados existentes (`pendiente_diseno`, `en_revision`, `ajustado`, `ajustes_solicitados`, `aprobado`, `finalizado`) se conservan; `listo_aprobacion` deja de usarse en nuevas solicitudes y las que estén en ese estado seguirán siendo aprobables.
