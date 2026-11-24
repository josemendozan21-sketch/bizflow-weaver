# Salidas de mercancía en el Punto 92

## Qué se agrega
En la pestaña "Entradas" del Punto de Venta, junto al formulario actual, un nuevo formulario **"Registrar salida de producto"** (la pestaña pasa a llamarse "Entradas y salidas").

Campos:
- Producto (muestra stock disponible)
- Cantidad (no deja sacar más de lo disponible)
- Motivo obligatorio: Devolución a bodega, Producto dañado, Muestra o regalo, Devolución a proveedor
- Destino / proveedor (opcional)
- Notas (obligatorias para "Producto dañado" y "Muestra o regalo")

Al registrar: baja el stock del producto y queda en el historial como salida con el motivo, quién la hizo y la fecha. No mueve dinero de caja ni cambia el costo promedio.

## Detalles técnicos
- Nuevo hook `useRegisterPosExit` en usePuntosVenta.ts: valida stock actual, actualiza `pos_products.available`, inserta en `pos_inventory_movements` con `direction: "salida"` y `source` = motivo.
- Revisar el trigger `enforce_pos_entry_origin` y cualquier restricción de `source`; si bloquea estos motivos, migración para permitirlos.
- Nuevo componente `PuntoSalidaForm.tsx` y prueba de la regla "no salir más de lo disponible".
