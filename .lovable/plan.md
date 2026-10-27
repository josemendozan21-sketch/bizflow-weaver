# Exportación diaria de ventas a World Office (WO)

## Análisis de la plantilla oficial
La plantilla tiene 4 hojas que se conservan tal cual: **Encabezados** (una fila por factura), **Movimientos de Inventarios** (una por producto), **Detalles del Pago** (una por forma de pago) y **Listas**. La app abre el archivo oficial, llena filas desde la 2 y no cambia encabezados, orden, formatos, comentarios ni hojas.

## Decisiones confirmadas
- Se factura el 100% el día de la venta, con los pagos que reportó el asesor.
- Forma de pago del encabezado: pago parcial = **Crédito** (el saldo queda como cuenta por cobrar, vence en la fecha de despacho); pago total = **Contado**.
- El número de factura lo asigna WO con su prefijo de factura electrónica. La app usa un número de enlace por archivo (1, 2, 3...) solo para unir las tres hojas; se valida en el piloto.
- Magical y Sweat Spot van en la misma empresa (BIONOVATIONS SAS, NIT 900793324).

## Lo que encontré en los listados de WO
- **Bodegas**: Principal, Consignación, Sweaspot 001 Chicó, Toberín Local, Feria Nacional, Feria Internacional.
- **Formas de pago para Factura de Venta**: Contado, Caja General, Bancolombia 36, Bancolombia 68, Davivienda 81, Tarjeta Crédito Ventas. **No existe "Crédito"** en el listado: hay que crearla en WO o indicar cuál usar.
- **Prefijos de factura de venta**: FEOC, FEVC, FVSP, FEMR, SETT y "comodín" por mes. Falta saber cuál usar.
- **Productos**: 484 productos con código (ej. MW-Gafas P = Frío Gafas Pequeñas, MW-Handy, SWP-...). Unidad "und", IVA 19%. Se cargan a la app y se emparejan con nuestras referencias; las que no empaten quedan marcadas para asignar a mano.
- **Vendedores y clientes**: 2.354 terceros con cédula/NIT; se pueden emparejar asesores (Ángela, Pilar, Jose...) y clientes por documento. Clientes nuevos que no estén en WO quedan señalados.

## Mapeo de campos
| Hoja / campo WO | Oblig. | Fuente en la app | Estado |
|---|---|---|---|
| Empresa | Sí | Ajuste fijo | Falta nombre exacto como figura en WO |
| Prefijo | No | Ajuste fijo | Falta elegir |
| Número de documento | Sí | Enlace del archivo | Validar en piloto |
| Fecha | Sí | Fecha de la venta | Existe |
| Vendedor | Sí | Cédula del asesor (desde listado WO) | Se empareja |
| Cliente | Sí | NIT/documento del pedido | Existe; se marca si no está en WO |
| Concepto | Sí | Código del pedido + referencia | Existe |
| Forma de pago (encabezado) | Sí | Crédito si hay saldo, Contado si pagó todo | Falta crear "Crédito" en WO |
| Fecha de vencimiento | Sí | Fecha de despacho programada (o la de venta si es contado) | Existe |
| Fecha de entrega | No | Fecha de despacho | Existe |
| Producto | Sí | Código WO de la referencia | Equivalencias desde listado |
| Bodega | Sí | Por marca/punto (Principal, Chicó...) | Confirmar regla |
| Unidad / Cantidad / Valor unitario / IVA / Descuento | Sí | Pedido (valor antes de IVA, und, 19, % desc.) | Existe |
| Detalle pago: forma y valor | Sí | Abono del asesor → Caja General / Bancolombia / Davivienda / Tarjeta | Equivalencia por cuenta |
| Banco, N° transacción, Fecha | Solo tarjeta/consignación | Comprobante del pago | Parcial |

## Qué verá Contabilidad
Nueva pestaña **Exportar a WO** en Contabilidad:
1. Elegir el día; lista de ventas pendientes, con su anticipo, saldo (CxC) y fecha de despacho.
2. Lo que falta aparece en rojo (código de producto, cliente no creado en WO...). Las incompletas no se exportan.
3. **Descargar plantilla WO** con las ventas elegidas, y **Copiar filas** por hoja para pegar en la plantilla original.
4. Al descargar quedan "Exportadas, por confirmar"; nada se marca como contabilizado solo por descargar.
5. Tras cargar en WO: **Confirmar cargue** (con número de factura WO opcional) o **Devolver a pendiente** con motivo.
6. Historial de exportaciones; una venta exportada no vuelve a salir salvo que se devuelva.
7. **Ajustes WO**: empresa, prefijo, bodega, equivalencias de productos, asesores y formas de pago, precargadas con los listados enviados.

## Prueba piloto
- 2 o 3 ventas reales con 50% de anticipo; generar el archivo y revisarlo contra la plantilla.
- Contabilidad lo carga en WO y reporta errores; se ajusta y se repite. No se declara listo hasta que WO lo acepte.
- Al final, instrucciones breves del proceso diario.

## Respuestas de Contabilidad (confirmadas)
- Saldo: forma de pago **Crédito**. Debe existir en WO con ese nombre exacto (hoy no aparece en el listado); si WO lo rechaza en el piloto, se crea allá.
- Prefijo: **FEVC**.
- Bodega: siempre **Principal**.
- Pagos: transferencias a **Bancolombia**; efectivo a **Caja General** en los casos que apliquen. Nequi u otros medios quedan marcados para revisión.

## Pendiente menor
- WO tiene dos cuentas Bancolombia (36 y 68): confirmar cuál usar, o si depende de la marca.

## Detalles técnicos
- Tablas nuevas: ajustes WO, equivalencias de productos/asesores/formas de pago, `wo_exports` y `wo_export_items` (estado exportado/confirmado/devuelto, único por pedido activo). RLS para admin/contabilidad.
- Listados WO cargados como datos de equivalencia; emparejamiento automático por nombre/documento con revisión manual.
- Plantilla oficial guardada en la app y llenada en el navegador con ExcelJS, solo valores en filas 2+, fechas reales dd/mm/aaaa.
- Mapeo y validación en un módulo puro con pruebas (Crédito vs Contado, vencimiento, IVA, división de pagos, faltantes, no doble exportación).
