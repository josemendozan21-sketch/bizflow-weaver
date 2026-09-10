# Descarga de todos los logos y archivos de referencia

## Qué está pasando (verificado en el pedido MW-PB-01215)

- El pedido tiene **2 logos** guardados (logo original y logo 2) y **1 archivo de referencia**.
- En la vista de Diseño el botón "Descargar" solo aparece junto al **logo original**. El "Logo 2" se muestra pero no tiene forma de abrirlo ni descargarlo. Por eso Diseño solo puede bajar uno.
- El campo de "Archivos de referencia" en el formulario de venta **reemplaza** la selección cada vez que el asesor elige archivos: si Pilar los adjuntó en dos momentos distintos, solo quedó guardado el último. Eso explica que solo haya 1 referencia registrada.
- El panel de referencias sí muestra y permite descargar todos los archivos que estén guardados; el problema está antes, al guardarlos.

## Qué se va a ajustar

1. **Todos los logos descargables en Diseño**
   - Cada logo (original, logo 2, logos extra) tendrá sus enlaces "Abrir" y "Descargar".
   - Estos enlaces quedan visibles también para el asesor y demás roles que ven la solicitud, no solo para la diseñadora.

2. **Adjuntar varias veces sin perder archivos (Magical y Sweatspot)**
   - Los archivos de referencia se van **acumulando** en vez de reemplazarse.
   - Se muestra la lista de archivos seleccionados con opción de quitar uno, y se evitan duplicados por nombre y tamaño.

3. **Descarga cómoda en el panel de referencias**
   - Botón "Descargar todos" que baja uno por uno los archivos de referencia del pedido.

4. **Sin cambios en el flujo**
   - No se toca el flujo de aprobación ni los estados de Diseño; solo visualización y adjuntos.

## Detalle técnico

- `src/components/diseno/TrabajoDisenador.tsx`: extraer la lista de logos (`original_logo_url`, `original_logo_url_2`, `extra_logos`) a un arreglo único y renderizar cada uno con enlaces abrir/descargar; quitar la condición `isDesigner` de esos enlaces.
- `src/pages/Ventas.tsx`: en los dos formularios (`mwRefFiles`, `ssRefFiles`) cambiar el `onChange` a modo acumulativo con deduplicación por `name+size`, limpiar el `value` del input tras cada selección y listar los archivos con botón de quitar.
- `src/components/diseno/ReferenceFilesPanel.tsx`: agregar acción "Descargar todos".
- Verificación: `npx tsgo --noEmit -p tsconfig.app.json`.

## Nota sobre MW-PB-01215

El segundo archivo de referencia que Pilar creyó haber adjuntado no llegó a guardarse, así que no se puede recuperar: tras el ajuste conviene volver a adjuntarlo desde Diseño o crear el pedido de prueba de nuevo.
