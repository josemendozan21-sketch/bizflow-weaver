# Volver al flujo simple de Diseño (sin pasos extra para Lina)

## Qué pasa hoy

Al subir un archivo, la pantalla ya no cambia sola de etapa: conserva la que esté seleccionada. Como el selector arranca en la etapa actual ("En revisión" o "Ajustado"), un diseño terminado puede quedarse guardado sin habilitar la aprobación del asesor, y no hay una señal clara de "esto ya está listo".

Lina no necesita esperar mensaje de nadie: puede publicarlo ella misma. Lo que falta es que esa acción sea obvia y de un solo clic.

## Cambios

1. **Botón principal "Guardar y enviar a aprobación"**
   - Al adjuntar un archivo, el botón principal de la tarjeta pasa a ser "Guardar y enviar a aprobación": un clic sube el archivo, deja el logo en "Listo para aprobación" y avisa al asesor.
   - Es el mismo comportamiento de antes, pero visible y voluntario.

2. **Guardar sin publicar sigue disponible**
   - Junto al botón principal queda "Guardar como borrador", que conserva la etapa elegida ("En revisión" o "Ajustado") para trabajos a medias.
   - El selector de etapa se mantiene para quien quiera fijarla manualmente.

3. **Saber en qué va cada logo**
   - En la tarjeta, un texto corto bajo el selector indica el estado real: "Solo tú lo ves — el asesor aún no puede aprobar" o "Publicado: el asesor ya puede aprobar".
   - El mensaje de confirmación al guardar refleja exactamente lo que ocurrió.

4. **Sin cambios para el asesor**
   - Pilar y los demás siguen aprobando o pidiendo modificación únicamente cuando el logo está en "Listo para aprobación", con "Abrir PDF" y "Descargar" como están hoy.

## Detalles técnicos

- Cambios acotados a `src/components/diseno/TrabajoDisenador.tsx`: dos acciones de guardado (`publicar` vs `borrador`) sobre la misma función existente, texto de estado y ajuste del valor por defecto del selector cuando hay archivo nuevo adjunto.
- No se toca la lógica de notificaciones, el historial de etapas ni los datos existentes.

## Verificación

- Subir un archivo y usar "Guardar y enviar a aprobación": el logo queda en "Listo para aprobación" y llega la notificación al asesor.
- Subir un archivo y usar "Guardar como borrador": conserva "En revisión"/"Ajustado" y el asesor no puede aprobar.
- Revisar en computador y móvil que ambos botones se vean completos.
