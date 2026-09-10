# Aprobar el diseño desde la primera revisión

## Qué está pasando

En la prueba con MW-PB-01213 el flujo funcionó así: Pilar creó el pedido, Diseño lo devolvió al asesor y ahí solo apareció "Solicitar modificación". El botón "Aprobar diseño" apareció recién después de que Lina hizo el ajuste pedido.

Eso viene de una versión anterior de la pantalla, en la que aprobar solo se habilitaba cuando el diseño llegaba marcado como "Listo para aprobación". La versión de hoy en el proyecto ya muestra los dos botones (aprobar y pedir cambios) apenas Diseño envía al asesor, sin importar si es la primera vuelta o un ajuste. Lo que vio Pilar es la versión publicada, que todavía es la anterior.

## Qué se hará

1. Revisar de punta a punta la tarjeta de revisión del asesor para confirmar que en la primera entrega ("En revisión") aparecen ambos botones: "Aprobar diseño" y "Solicitar modificación".
2. Ajustar el texto de ayuda para que quede claro que el asesor puede aprobar de una vez si el diseño está bien, o pedir cambios con su comentario.
3. Publicar la aplicación para que Pilar, Lina y el resto vean el flujo corregido.
4. Verificar con el pedido de prueba MW-PB-01213 que al aprobar pasa a producción y queda registrado en el historial del pedido.

## Detalle técnico

- `src/components/diseno/TrabajoDisenador.tsx`: el bloque de revisión del asesor ya se muestra para los estados `en_revision`, `ajustado` y `listo_aprobacion` (`ADVISOR_REVIEW_STATUSES`). Se confirma que `handleApprove` no tenga condiciones extra por estado y se afina el texto guía.
- No se cambian estados en la base de datos ni el historial existente (`logo_request_status_log`).
- El pedido de prueba MW-PB-01213 quedó en `ajustado` con el comentario de Pilar; sirve para validar la aprobación final.
