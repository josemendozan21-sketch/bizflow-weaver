# Exportación diaria de ventas a World Office (WO)

## Análisis de la plantilla oficial
La plantilla tiene 4 hojas que se conservan tal cual: **Encabezados** (una fila por factura), **Movimientos de Inventarios** (una fila por producto), **Detalles del Pago** (una fila por forma de pago) y **Listas** (formas de pago válidas). La app abrirá el archivo oficial, llenará filas desde la 2 y no cambiará encabezados, orden, formatos, comentarios ni hojas.

## Decisiones confirmadas
- Se factura el 100% el día de la venta, con las formas de pago que reportó el asesor.
- El número de factura lo asigna WO (factura electrónica con su prefijo). La app usará un número temporal de enlace por archivo (1, 2, 3...) solo para unir las tres hojas; hay que confirmar en el piloto que WO lo acepta así.
- Magical y Sweat Spot van en la misma empresa de WO.
- Contabilidad enviará los códigos de WO (productos, vendedores, clientes, bodega, formas de pago).

## Mapeo de campos
| Hoja / campo WO | Obligatorio | Fuente en la app | Estado |
|---|---|---|---|
| Empresa | Sí | Ajuste fijo de Contabilidad | Falta el nombre exacto en WO |
| Prefijo | No | Ajuste fijo | Falta |
| Número de documento | Sí | Consecutivo temporal del archivo | Validar en piloto |
| Fecha | Sí | Fecha de la venta (dd/mm/aaaa) | Existe |
| Vendedor | Sí | Cédula del asesor | Falta guardarla por asesor |
| Cliente | Sí | NIT/documento del pedido o cliente | Existe; se marca si falta |
| Concepto | Sí | Código del pedido + referencia | Existe |
| Forma de pago (encabezado) | Sí | "Contado" o "Crédito" según saldo | Confirmar nombres en WO |
| Fecha de vencimiento | Sí | Fecha de despacho programada | Existe |
| Fecha de entrega | No | Fecha de despacho | Existe |
| Producto | Sí | Código WO de la referencia | Falta tabla de equivalencias |
| Bodega / Unidad | Sí | Ajuste fijo o por producto | Falta |
| Cantidad, Valor unitario | Sí | Pedido (valor antes de IVA) | Existe |
| IVA % | Sí | Pedido (19 o 0) | Existe |
| Descuento % | Sí | Pedido, 0 si no aplica | Existe |
| Detalle de pago: forma y valor | Sí | Pagos/abonos registrados | Existe; equivalencia de nombres pendiente |
| Banco, N° transacción, Fecha | Solo tarjeta/consignación | Comprobante del pago | Parcial |

Los demás campos opcionales (impoconsumo, centro de costos, etc.) quedan vacíos.

## Qué verá Contabilidad
Nueva pestaña **Exportar a WO** en Contabilidad:
1. Elegir el día; lista de ventas pendientes de contabilizar.
2. Cada venta muestra en rojo lo que falta (cédula del asesor, NIT, código de producto...). Las incompletas no se pueden exportar.
3. Botón **Descargar plantilla WO** con las ventas seleccionadas, y opción **Copiar filas** por hoja para pegar en la plantilla original.
4. Las ventas exportadas quedan "Exportadas, pendientes de confirmar". Nada se marca como contabilizado al descargar.
5. Después de cargar en WO, Contabilidad pulsa **Confirmar cargue** y puede escribir el número de factura WO por venta. Si WO rechaza, puede **Devolver a pendiente** con motivo.
6. Historial de exportaciones: quién, cuándo, qué ventas y estado. Una venta exportada o confirmada no vuelve a salir salvo que se devuelva a pendiente.
7. Sección **Ajustes WO**: empresa, prefijo, bodega, unidad, cédula por asesor, equivalencia de formas de pago y de productos (con carga desde el listado que envíe Contabilidad).

## Prueba piloto
- Tomar 2 o 3 ventas reales con 50% de anticipo y saldo a la fecha de despacho; generar el archivo y revisarlo hoja por hoja contra la plantilla.
- Contabilidad lo carga en WO (o lo pega en la plantilla original) y reporta errores; se ajusta y se repite.
- No se declara listo hasta que WO acepte el archivo. Al final, instrucciones breves para el proceso diario.

## Pendiente de Contabilidad antes del piloto
- Listado de códigos WO: productos, cédulas de vendedores, bodega, unidad de medida, formas de pago.
- Nombre exacto de la empresa y prefijo en WO.
- Confirmar si la forma de pago del encabezado debe ser "Contado"/"Crédito" u otro nombre.

## Detalles técnicos
- Tablas nuevas: `wo_settings`, `wo_product_codes`, `wo_payment_method_map`, cédula WO por asesor, `wo_exports` y `wo_export_items` (estado exportado/confirmado/devuelto, número WO, único por pedido activo para evitar doble exportación). RLS para admin/contabilidad.
- Plantilla oficial guardada como archivo de la app; se llena en el navegador con una librería que conserve estilos y comentarios (ExcelJS), escribiendo solo valores en filas 2+ con fechas como fecha real en formato dd/mm/aaaa.
- Lógica de mapeo y validación en un módulo puro con pruebas (fechas, IVA, división de pagos, campos faltantes, no doble exportación).
