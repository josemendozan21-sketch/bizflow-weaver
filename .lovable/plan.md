# Plan: corregir expansión de comisiones y previsualización universal de logos

## 1. Tabla de comisiones realmente expandible

- Reproducir el fallo en la vista autenticada del asesor y en Contabilidad antes de modificar el comportamiento, verificando clics, estado React y posibles elementos que intercepten el evento.
- Convertir la primera columna en un **botón de expansión explícito** con chevron dentro de un control visible, tooltip/etiqueta accesible y estado abierto/cerrado. La fila completa también podrá abrirse, sin interferir con “Solicitar corrección” ni con los controles de forma de pago.
- Mostrar debajo de la fila, al abrirla, todo el desglose solicitado: factura, tipo, flete y cargos, base comisionable, abono, base sin IVA, tarifa y motivo.
- Aplicar exactamente el mismo patrón en `MisComisiones` y `CommissionsPanel`.

## 2. Estados compactos, con color y sin desbordamiento

- Crear una presentación compartida para los estados de comisión, con variantes semánticas claras:
  - verde: comisión total;
  - azul: parcial por abono;
  - ámbar: pendiente;
  - gris: excluido.
- Mantener el texto corto en una sola línea y trasladar siempre el motivo largo al detalle expandido.
- Ajustar anchos, padding y distribución de columnas para que Estado y Acción permanezcan visibles sin scroll horizontal en la pantalla del asesor; en tamaños estrechos, usar un layout compacto adaptable en lugar de comprimir o cortar el pill.

## 3. Componente universal de logos

- Fortalecer `LogoPreview` para centralizar todos los formatos y estados:
  - imágenes PNG/JPG/JPEG/WebP/SVG con fondo contrastante tipo tablero o superficie oscura/clara, para que los logos blancos sean visibles;
  - PDF con miniatura real de la primera página, renderizada de forma diferida en el navegador;
  - indicador de carga, fallback legible si falla la descarga/renderización y enlace para abrir o descargar;
  - archivos no previsualizables, como AI, con tarjeta identificable en vez de imagen rota.
- Detectar el tipo por extensión y, cuando no sea suficiente, por respuesta/MIME; evitar que una URL válida pero no renderizable llegue a un `<img>`.
- Reemplazar los renderizados directos encontrados en las vistas de Diseño y Estampación, incluyendo solicitudes nuevas, trabajo del diseñador, aprobación, finalizados, ingreso a estampación, tarjetas de producción y logos secundarios. También unificar la vista previa del archivo recién seleccionado por el diseñador.
- Mantener las fotografías de producto y evidencias fuera de este cambio: solo se migrarán campos que representan archivos de logo.

## 4. Miniaturas PDF

- Incorporar un renderizador PDF cliente para dibujar únicamente la primera página en un canvas, con carga diferida para no descargar cientos de PDFs al mismo tiempo.
- Limitar resolución y liberar recursos al desmontar el componente; si el navegador, CORS o el PDF impiden renderizarlo, mostrar automáticamente la tarjeta “PDF · Abrir archivo” sin dejar un espacio blanco.
- No modificar los archivos originales ni generar copias permanentes en almacenamiento.

## Verificación

- Probar con Playwright, usando la sesión real, que el chevron abre y cierra cada detalle tanto para asesor como para Contabilidad, y que “Solicitar corrección” sigue funcionando de forma independiente.
- Verificar a 1191 px y 1280 px que no existe scroll horizontal y que los cuatro estados conservan color, texto y tamaño.
- Probar logos blancos, imágenes comunes, PDF y archivo inválido en todas las vistas migradas; confirmar que nunca aparece un `<img>` roto y que los PDFs muestran miniatura o fallback.
- Ejecutar typecheck y pruebas focalizadas del componente de preview y de la expansión.

## Detalles técnicos

- Componentes previstos: `CommissionStatusBadge`, control de fila expandible reutilizable y ampliación de `LogoPreview`.
- La miniatura PDF se resolverá con PDF.js cargado en el frontend; no requiere cambios de base de datos ni de almacenamiento.
