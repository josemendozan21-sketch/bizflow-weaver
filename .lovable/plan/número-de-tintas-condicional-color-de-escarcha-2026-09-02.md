# Número de tintas condicional + color de escarcha

## Qué cambia para el asesor (Magical Warmers, pedidos al por mayor)

En cada línea de producto del formulario de ventas:

1. **Número de tintas**: nuevo selector con opciones 1, 2 y 3.
2. **Campos condicionales**: al elegir 1 aparece "Color de tinta 1"; al elegir 2 aparecen tinta 1 y 2; al elegir 3, las tres. Si se baja el número, los colores sobrantes se limpian.
3. Cada color de tinta mantiene la lista actual de colores más la opción "Otro (escribir)".
4. **Color de escarcha**: nuevo selector opcional cuyas opciones se cargan desde inventario. Se crean 3 colores de prueba (Escarcha Dorada, Escarcha Plateada, Escarcha Roja) como ítems de inventario de la marca Magical, para que Inventarios pueda agregar, editar o eliminar colores de escarcha con las mismas acciones que ya tiene en el panel de referencias.

El resumen del pedido, la validación antes de enviar y la información que ven Producción y Estampación muestran los colores de tinta (1 a 3) y el color de escarcha.

## Detalle técnico

**Base de datos (migración)**
- `orders`: agregar `ink_count int default 1`, `ink_color_2 text`, `ink_color_3 text`, `glitter_color text`.
- `production_orders`: agregar los mismos cuatro campos para que la información llegue a producción/estampación.
- Los colores de escarcha se insertan como filas en `stock_items` (`category = 'materia_prima'`, `brand = 'magical'`, nombres con prefijo "Escarcha ") mediante inserción de datos; no requiere tabla nueva.

**Frontend**
- `src/pages/Ventas.tsx`
  - `OrderLine`: `inkCount: 1|2|3`, `inkColor2/inkCustom2`, `inkColor3/inkCustom3`, `glitterColor/glitterCustom`.
  - Reutilizar el componente `ColorSelect` para tintas 2 y 3.
  - Nuevo `GlitterSelect` que consume las opciones de inventario (`stock_items` filtrados por nombre que inicia en "Escarcha") vía el hook de inventario ya usado en la página; incluye "Otro (escribir)".
  - Actualizar: clave de consolidación de líneas, validación de "Color de tinta requerido" (exige tantos colores como el número elegido), `buildMagicalMayorSummary` y el insert de `orders`/`production_orders`.
- `src/lib/orderFlow.ts`: propagar los nuevos campos al crear la orden de producción.
- Vistas de producción/estampación: mostrar tintas y escarcha donde hoy se muestra `ink_color`.

**Alcance**: solo el flujo Magical Warmers al por mayor (el que muestra la captura). Sweatspot y detal quedan igual salvo indicación contraria.
