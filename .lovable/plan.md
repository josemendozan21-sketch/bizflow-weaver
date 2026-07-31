## 1. Caja menor para el usuario de Contabilidad

Hoy contabilidad ya ve la pestaña "Caja menor", pero en la base de datos solo puede **ver** y **crear** fondos: no puede editarlos ni eliminarlos (solo admin). Eso impide "gestionar y organizar".

- Migración: agregar permisos de edición y eliminación de fondos de caja menor al rol contabilidad (los gastos ya los puede gestionar).
- En la pantalla de Caja menor: permitir a contabilidad editar el monto/notas de un fondo y eliminar un fondo o un gasto con confirmación, además de registrar ingresos y gastos como hoy.
- Mantener el cálculo actual del saldo (ingresos acumulados − gastos).

## 2. Carga masiva de ventas por feria (admin y contabilidad)

Dentro del detalle de cada feria, en la pestaña **Ventas**, agregar un bloque "Carga masiva de ventas" visible solo para admin y contabilidad.

- Botón "Descargar plantilla" (.xlsx) con las columnas esperadas, y botón "Subir archivo" que acepta .xlsx y .csv.
- Columnas mínimas: Producto, Unidades, Precio unitario. Opcionales: Marca, Medio de pago, Fecha, Cliente, Documento/NIT, Teléfono, Email, Ciudad, Notas.
- El archivo se procesa en el navegador: se muestra una **vista previa** con las filas leídas, el total calculado (unidades × precio) y los errores por fila (producto vacío, cantidad/precio no numérico).
- Al confirmar, se insertan las ventas en la feria abierta, marcadas como carga masiva en las notas para poder distinguirlas.
- Si el producto coincide con el inventario asignado a la feria, se descuenta la cantidad vendida; si no coincide, la venta se registra igual y se avisa que no se descontó inventario.

## 3. Tres bodegas en Inventarios (vista unificada)

En el módulo de Inventarios se agrega un selector de bodega en la parte superior: **Bodega principal**, **Punto de la 92** y **Ferias**. No se duplican datos: cada bodega lee su fuente actual.

- **Bodega principal**: lo que ya existe hoy (stock central por marca y categoría). Comportamiento sin cambios.
- **Punto de la 92**: lista de solo lectura de los productos del punto con existencias, precio y valor de inventario, más buscador por marca/nombre y totales.
- **Ferias**: inventario asignado por feria (selector de feria), con enviado, vendido y disponible, y totales.
- El resumen superior de tarjetas se mantiene y muestra los indicadores de la bodega principal.
- Traslados: botón "Trasladar a Punto 92 / a Feria" desde la bodega principal, que descuenta del stock central y suma en el destino, dejando registro en el historial de movimientos. (Si prefieres dejar los traslados para una segunda etapa, se puede omitir.)

## Detalles técnicos

- Migración SQL: nuevas políticas de UPDATE/DELETE en `petty_cash_funds` para `contabilidad`.
- Ventas masivas: nuevo componente `FeriaBulkSalesUpload.tsx` montado en `FeriaSalesTab.tsx`; lectura de Excel/CSV con la librería `xlsx` ya usada en exportaciones; inserción por lotes en `feria_sales` (las políticas actuales ya permiten a admin y contabilidad insertar).
- Bodegas: nuevo componente `WarehouseSelector` + `Punto92WarehousePanel` y `FeriasWarehousePanel` (solo lectura sobre `pos_products` y `feria_inventory`), integrados en `InventariosRoleView.tsx` y `Inventarios.tsx`. Los traslados usan `inventory_movements` para la salida del stock central y actualizan la tabla destino.
- No se modifica la lógica actual de reservas, producción ni despachos.
