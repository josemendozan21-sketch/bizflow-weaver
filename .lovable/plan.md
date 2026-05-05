# Mejoras al Feria POS

Voy a mejorar la pantalla de Feria Punto de Venta para que el equipo pueda capturar más datos en cada venta, ver totales por medio de pago en tiempo real y consultar el inventario real (despachado vs vendido vs disponible).

## 1. Medios de pago actualizados
Reemplazar las opciones actuales (efectivo, transferencia, datáfono, otro) por las que usan en feria:
- **Efectivo**
- **Tarjeta** (datáfono)
- **Nequi**
- **Transferencia**
- **Otro**

Esto se aplica tanto en la venta rápida (carrito) como en la venta con detalle.

## 2. Carrito con datos completos del cliente y descuento
En el panel del Carrito (`QuickSaleGrid`) agregar antes del botón "Cobrar":
- Medio de pago (con las opciones nuevas)
- **Descuento** (valor en pesos, opcional) — se resta del subtotal
- **Nombre del cliente** (opcional)
- **Email** (opcional)
- **Cédula / NIT** (opcional)

El total mostrado se calcula como: subtotal − descuento. Las unidades y la venta total se ven siempre arriba.

Estos datos se guardan en cada `feria_sales` creado al cobrar (notes guardará email/documento/descuento ya que la tabla no tiene columnas dedicadas a esos campos — ver sección técnica).

## 3. Barra superior con totales en tiempo real
En `FeriaPOS.tsx`, debajo de la tarjeta de la feria, agregar una fila de tarjetas resumen con los totales del día/feria:
- **Ventas totales** (suma de `total_amount` de todas las ventas de la feria)
- **Unidades vendidas**
- **Efectivo**
- **Tarjeta**
- **Nequi**
- **Transferencia / Otro** (agrupado)

Se calcula desde `sales` ya disponible en el componente — actualización automática al registrar una venta.

## 4. Nueva pestaña "Inventario en feria"
Agregar una pestaña adicional (`Tabs`) llamada **"Inventario"** que muestre, por producto despachado:

| Producto | Marca | Despachado | Vendido | Disponible | Ingreso generado |
|----------|-------|-----------:|--------:|-----------:|----------------:|
| Magical Warmer | Magical | 50 | 12 | 38 | $480.000 |

Visible para todos los roles que entran al POS (incluido `feria_pos`), para que sepan exactamente qué les queda y cuánto han facturado por producto.

## 5. Detalles técnicos

**Archivos a modificar:**
- `src/components/feria-pos/QuickSaleGrid.tsx` — agregar inputs de descuento, cliente, email, documento; nuevas opciones de pago; descontar del total.
- `src/components/feria-pos/DetailedSaleForm.tsx` — agregar email, documento, descuento; nuevas opciones de pago.
- `src/pages/FeriaPOS.tsx` — barra superior de totales por medio de pago + nueva pestaña "Inventario".
- Nuevo: `src/components/feria-pos/FeriaInventoryStatus.tsx` — tabla de inventario real con cálculo despachado − vendido.

**Almacenamiento de email/documento/descuento:**  
La tabla `feria_sales` no tiene columnas para email, documento ni descuento. Para no requerir migración, se guardarán dentro del campo `notes` con un formato estructurado: `Cliente: Juan | Doc: 123 | Email: x@y.com | Desc: $5000`. Si después prefieres columnas dedicadas, podemos agregar una migración (`client_email`, `client_document`, `discount_amount`) — dime y lo hacemos.

**Cálculo de inventario disponible:** ya existe la lógica en `QuickSaleGrid` (`quantity_dispatched − sum(sales.quantity)`); se reutiliza en el nuevo componente.

**Sin cambios en base de datos** en esta iteración.

¿Apruebas el plan así, o prefieres que también agregue las columnas dedicadas en la base de datos para email / documento / descuento?