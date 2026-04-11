

## Plan: Selectores de color con opción personalizada + Multi-pedido en Magical Warmers

### Cambios en `src/pages/Ventas.tsx`

**1. Reemplazar campos de texto de Color de gel y Color de tinta por Select con opción "Otro"**

Los colores predefinidos serán:
- Azul, Rosado, Morado, Negro, Blanco, Transparente, Aguamarina, Azul claro, Verde lima, Verde militar

Cada selector (gel y tinta) tendrá las opciones anteriores + "Otro (escribir)". Al seleccionar "Otro", aparece un Input de texto libre debajo.

Se usarán estados controlados (`gelColor`/`gelCustom`, `inkColor`/`inkCustom`) en vez de leer del FormData directo.

**2. Agregar soporte para múltiples líneas de pedido**

Un cliente puede pedir varios moldes con diferentes colores. Se agregará:
- Un array de estado `orderLines[]` donde cada línea tiene: producto, tipo, unidades, color gel, color tinta, valor unitario
- Botón "Agregar otro producto" que añade una línea nueva
- Botón de eliminar por línea (si hay más de una)
- El total se calcula sumando todas las líneas
- Al crear el pedido, se itera sobre las líneas creando un `order` y `production_order` por cada una (mismo cliente, mismos datos generales)

**3. Estructura de cada línea de pedido**

Cada línea contendrá:
- Producto/Referencia (Select existente)
- Tipo (Select existente)
- Color de gel (Select + campo personalizado)
- Color de tinta (Select + campo personalizado)
- Unidades
- Valor unitario
- Valor total (auto-calculado por línea)

**4. Lógica de envío**

Al hacer submit, se recorren todas las líneas y se crea un pedido independiente por cada una (ya que cada línea puede tener molde y colores distintos, y el sistema de producción los maneja individualmente). Los datos del cliente, abono, estado de pago y archivos se comparten entre todas las líneas.

### Archivos a modificar
- `src/pages/Ventas.tsx` — componente `MagicalMayorForm`

