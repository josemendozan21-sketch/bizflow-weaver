# Restaurar el flujo original de estados en Diseño

## Objetivo
Devolver a Lina el control manual que tenía antes: seleccionar una sola vez el estado deseado y guardarlo, sin que subir un archivo ni un botón lo cambien automáticamente.

## Cambios
- Eliminar el cambio automático a **“Listo para aprobación”** al seleccionar un archivo.
- Quitar la acción nueva que fuerza **“Listo para aprobación”** desde el botón principal.
- Restaurar el control original: selector de estado + un único botón **“Guardar”** que conserva exactamente la opción elegida (`En revisión`, `Ajustado` o `Listo para aprobación`).
- Mantener la notificación al asesor únicamente cuando Lina guarde voluntariamente el estado **“Listo para aprobación”**.
- Mantener sin cambios la aprobación del asesor y el paso posterior hacia Estampación.

## Correcciones que se conservan
- Apertura y descarga explícita de archivos PDF.
- Extensión y tipo de archivo correctos al subir PDFs.
- Vista previa y manejo de errores de archivos.
- Actualización del estado con los cambios en tiempo real.

## Validación
- Subir un archivo con `En revisión` y comprobar que permanece `En revisión` después de guardar y recargar.
- Repetir con `Ajustado`.
- Guardar manualmente como `Listo para aprobación` y comprobar que el asesor puede aprobar y recibe la notificación.
- Confirmar que abrir y descargar PDFs sigue funcionando.

## Alcance técnico
El cambio funcional se limitará a `TrabajoDisenador.tsx`; no se modificarán datos históricos, archivos PDF existentes ni el flujo de aprobación del asesor.
