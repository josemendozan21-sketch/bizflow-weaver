# Color de tinta unificado en Sweatspot

Hoy el asesor de Sweatspot escribe el color de tinta en un campo de texto libre, mientras que en Magical el color se elige de una lista que se arma automáticamente desde la materia prima de Inventarios (ítems cuyo nombre empieza por "Tinta"). El objetivo es que Sweatspot use exactamente la misma lista, y que si Inventarios agrega, edita o elimina una tinta, la lista se actualice sola.

## Qué cambia para el asesor

- El campo "Color de tinta" de cada producto Sweatspot pasa de ser texto libre a un selector con los mismos colores que ve Magical.
- La lista se alimenta en vivo de la materia prima de Inventarios: cualquier tinta nueva aparece sin necesidad de tocar código.
- Sigue siendo obligatorio: no se puede guardar el producto sin escoger tinta.
- Si un pedido antiguo (o el pegado inteligente) trae un color que ya no existe en la lista, se muestra igual como opción para no perder el dato.
- Si Inventarios aún no tiene tintas cargadas, el selector muestra un aviso de que no hay colores disponibles y se debe pedir a Inventarios que los registre.

## Detalles técnicos

- En `src/pages/Ventas.tsx` el formulario Sweatspot (componente que empieza cerca de la línea 1940) ya usa `useInventory()`; se le agrega `stockItems` para derivar la misma lista de tintas que usa Magical.
- La derivación de tintas (`inkOptions`: filtra `^tinta\b` y limpia el prefijo "Tinta / Tinta PVC") se extrae a un helper compartido (por ejemplo `inkOptionsFromStock()` en `src/lib/referenceCatalog.ts` o un helper local exportado) para que Magical y Sweatspot usen una sola fuente y no se dupliquen reglas.
- Se reemplaza el `<Input>` de "Color de tinta" por el componente `ColorSelect` ya existente en el archivo, con `allowCustom={false}`, igual que Magical.
- Se conserva el valor actual de la línea como opción adicional cuando no esté en la lista (valores heredados o autocompletados por SmartPaste).
- No hay cambios de base de datos: se sigue guardando `ink_color` como texto.
- Alcance: solo el formulario de venta al por mayor de Sweatspot. El color de silicona y demás campos quedan igual.
