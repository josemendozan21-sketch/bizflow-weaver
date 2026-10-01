# Quitar el descuento automático de Mezcla Gel

Hoy, cada vez que un asesor guarda un pedido de Magical, el sistema descuenta Mezcla Gel automáticamente (por eso aparecen tantas filas "consumo_automatico" a nombre de Pilar y Angela). Como una bolsa alcanza para varios pedidos, ese descuento no refleja la realidad.

## Qué cambia

1. Al guardar un pedido ya no se descuenta Mezcla Gel. Deja de salir el aviso "Inventario de gel" al asesor.
2. La salida de Mezcla Gel la registra Inventarios a mano en **Entradas y salidas** cuando realmente abre o entrega una bolsa, como cualquier otra materia prima. Ese formulario ya existe y queda en el historial.
3. Los descuentos automáticos anteriores no se tocan: quedan en el historial. Si la cantidad actual de Mezcla Gel no corresponde, Inventarios la ajusta con un conteo.

## Fuera de alcance

- No cambia la reserva de cuerpos ni ningún otro descuento de inventario.
- No cambia la producción de mezcla (batches) en Materia Prima.

## Detalles técnicos

- `src/pages/Ventas.tsx` (~línea 1269): eliminar la llamada `discountStockDB("gel", ...)` y su toast.
- Quitar `discountStock` del destructuring de `useInventory` si queda sin uso; la función en `useInventory.ts` y el RPC `consume_stock_item` se mantienen (los usa la reserva de cuerpos).
- Sin cambios de base de datos.
