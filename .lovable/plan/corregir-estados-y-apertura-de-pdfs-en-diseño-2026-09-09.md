# Corregir estados y apertura de PDFs en Diseño

## Diagnóstico confirmado

- Al guardar un archivo ajustado, la pantalla reemplaza automáticamente la etapa escogida por Lina y lo pasa a **“Listo para aprobación”**. El historial reciente confirma esas transiciones automáticas.
- La revisión de Pilar aparece siempre que existe un archivo ajustado, aunque el logo todavía esté **“En revisión”** o **“Ajustado”**.
- El PDF mostrado en la captura (`MW-PB-01192`, Mafe Briceño) está almacenado correctamente, responde como PDF y se puede descargar. El problema está en la acción de apertura de la pantalla, no en el archivo subido.

## Cambios

1. **Respetar la etapa elegida por Diseño**
   - Subir o reemplazar un archivo no cambiará automáticamente la etapa.
   - “En revisión” y “Ajustado” conservarán el trabajo dentro de Diseño.
   - Solo al escoger explícitamente **“Listo para aprobación”** se publicará al asesor y se enviará la notificación.
   - El mensaje posterior a guardar reflejará la etapa real, sin anunciar publicación cuando no ocurrió.

2. **Mostrar la aprobación únicamente en el momento correcto**
   - Pilar y los demás asesores solo verán **Aprobar diseño / Solicitar modificación** cuando el estado sea “Listo para aprobación”.
   - Un archivo guardado como “En revisión” o “Ajustado” podrá existir y verse dentro del trabajo de Diseño, pero no quedará habilitado para aprobación del asesor.
   - Los casos de recompra conservarán su flujo especial, sin abrir anticipadamente diseños nuevos.

3. **Apertura confiable del PDF**
   - Convertir “Abrir PDF” en una acción explícita que no quede afectada por el área clicable usada para reemplazar archivos.
   - Evitar propagación del clic y abrir el documento en una pestaña nueva; agregar una alternativa de descarga si el navegador bloquea la vista.
   - Detectar PDF tanto por extensión como por el tipo real del archivo y guardar el tipo correcto al subirlo.
   - Mostrar un error claro si el documento ya no está disponible, en vez de dejar un botón que parece no responder.

4. **Estado local sincronizado**
   - Sincronizar el selector y la vista previa cuando llegue una actualización en tiempo real, evitando que una tarjeta conserve una etapa anterior o cambie visualmente sin intervención.

## Verificación

- Con perfil de Lina: subir un PDF y guardar sucesivamente como “En revisión”, “Ajustado” y “Listo para aprobación”; comprobar que solo la última opción lo publica y notifica.
- Con perfil de Pilar: verificar que no puede aprobar durante “En revisión”/“Ajustado”, que sí puede hacerlo en “Listo para aprobación” y que el PDF de `MW-PB-01192` abre o descarga correctamente.
- Revisar imagen y PDF en computador y móvil, historial de etapas y ausencia de errores en pantalla.
- Ejecutar las comprobaciones de tipos y pruebas focalizadas del flujo de Diseño.

## Detalles técnicos

- Ajustes principales en `TrabajoDisenador`, `LogoPreview` y la subida de archivos de logos.
- No se cambiarán los PDFs existentes ni los datos históricos; solo se corregirá el comportamiento futuro y la forma de abrir los archivos ya guardados.
