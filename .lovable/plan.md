# Excel del catálogo del Punto de la 92 + fotos de producto

El Excel ya está generado y adjunto en el chat: sale del catálogo real de hoy (353 productos, 12 marcas) con toda la información existente.

## Lo que trae el archivo

Hoja "Catálogo", una fila por producto:

| Columna | Para qué |
|---|---|
| Producto | Nombre exacto tal como está hoy |
| Marca | Lista desplegable con las 12 marcas existentes |
| Categoría | Categoría del producto |
| Proveedor | Proveedor registrado |
| Precio de venta | En pesos, con formato $ |
| Existencias | Conteo físico |
| Unidad | unidades, par, etc. |
| Activo | SÍ / NO (NO lo oculta sin borrar su historial) |
| Tiene foto | Informativo: SÍ / NO (hoy 151 productos no tienen foto) |
| Foto nueva | Nombre del archivo de la imagen que van a subir |

Hoja "Instrucciones" con las reglas y el listado de marcas válidas.

## Ajustes al Excel que ya vive en la app

La plantilla que descarga el botón "Descargar plantilla" hoy no incluye Proveedor ni las dos columnas de foto. Se alinea con el archivo entregado:

- Añadir "Proveedor", "Tiene foto" y "Foto nueva" a la plantilla y al lector del archivo.
- Permitir actualizar el proveedor desde el Excel, con su antes → después en la vista previa y en el historial.
- Hoy el archivo rechaza existencias negativas. Se mantiene así, pero el mensaje dirá claramente que deben escribir el conteo físico (hay productos con existencias negativas en el sistema, que quedan en cero al corregirlos).

## Fotos de los productos

Se mantiene lo que ya usan a diario (la cámara del celular producto por producto) y se suma una carga por lotes:

1. En el Excel escriben en "Foto nueva" el nombre del archivo, por ejemplo `termo-azul.jpg`.
2. Al subir el Excel, un segundo selector permite arrastrar todas las imágenes de una vez (o un .zip).
3. La vista previa muestra: fotos que se asignan correctamente, fotos que sobran y filas que piden una foto que no se adjuntó.
4. Al confirmar, cada imagen se sube al mismo almacenamiento que usan hoy y queda enlazada a su producto.

Si prefieren no cargar fotos por lotes, basta con dejar la columna "Foto nueva" vacía y seguir usando la cámara; el resto del Excel funciona igual.

## Detalle técnico

- `src/lib/posCatalogTemplate.ts`: agregar `Proveedor`, `Tiene foto` (solo lectura) y `Foto nueva` a `CATALOG_HEADERS`; incluir `supplier` y `photo_url` en `CatalogProduct`; comparar `supplier` en `buildCatalogDiff`; validación de lista para Marca y Activo.
- `src/components/puntos-venta/PosCatalogBulkUpdate.tsx`: segundo input `multiple accept="image/*,.zip"`; mapa `nombreArchivo → File` normalizado; sección de fotos en la vista previa; al aplicar, `uploadPosProductPhoto` por imagen y `photo_url` en el update/insert. Las subidas se hacen en lotes de 5 con barra de progreso.
- El trigger `log_pos_product_change()` ya registra los cambios; se añade `photo_url` y `supplier` a los campos auditados en una migración corta para que aparezcan en la pestaña Historial de cambios.
- Sin cambios en ventas, entradas ni movimientos de inventario.
