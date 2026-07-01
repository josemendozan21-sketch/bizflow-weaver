## Objetivo
Dejar la feria **Vassar** en cero de ventas, entregarte un Excel con los productos despachados a esa feria y, con esa base, crear los "kits" que armen en el punto para que aparezcan como productos vendibles en el POS de ferias.

## Pasos

1. **Borrar ventas de Vassar**
   - Eliminar los 6 registros de `feria_sales` asociados a la feria Vassar (`6b06a134-…`).
   - No se tocan `feria_inventory`, despachos ni asignaciones de personal.

2. **Excel de productos enviados a Vassar** → `/mnt/documents/vassar_productos_enviados.xlsx`
   - Columnas: Marca, Producto, Cant. asignada, Cant. despachada, Cant. devuelta, Precio de venta, Costo unitario, Notas.
   - Se incluye una segunda hoja **"Kits (llenar)"** con columnas vacías: Nombre del kit, Precio de venta, Producto 1, Cant 1, Producto 2, Cant 2, Producto 3, Cant 3, Notas — para que la llenes o me digas por chat.

3. **Esperar tus datos de kits**
   - Me pasas nombre, precio y contenido de cada kit.
   - Confirmo si los kits deben:
     - (a) crearse como un **producto suelto** en `feria_inventory` de Vassar con su precio (más simple, no descuenta stock de los componentes), o
     - (b) crearse como producto y además, al venderse, descontar automáticamente el stock de cada componente del kit (requiere una tabla nueva `feria_kit_components` y ajustar la lógica de venta).

4. **Alta de los kits** (una vez confirmado el modo)
   - Insertar cada kit en el inventario de Vassar con su precio.
   - Quedan disponibles en el buscador del POS de ferias (Venta rápida) igual que cualquier otro producto.

## Nota técnica
- Los pasos 1 y 2 se hacen en el mismo turno de build.
- El paso 4 se hace en un turno posterior cuando me pases los datos y elijas (a) o (b).
