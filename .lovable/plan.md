# Fotos de producto finalizado: una por cada producto/color del pedido

## Qué encontré

Al finalizar, el diálogo de "Producto finalizado" permite subir una sola foto, que queda guardada en la línea que se finaliza. Además, la tarjeta del asesor en Mis Pedidos solo muestra la foto de la primera línea. Por eso, en un pedido de gafas + flores o de dos colores, Pilar solo ve una foto.

## Qué se va a hacer

1. **Una foto obligatoria por cada producto o color:** al finalizar, el diálogo muestra una casilla de foto por cada línea del pedido (por ejemplo "Gafas grandes (Frío) · 50 uds" y "Flor (Frío) · 50 uds"). Si el pedido tiene 2 productos o colores, se piden 2 fotos; si tiene 3, se piden 3. No deja confirmar hasta subirlas todas. Funciona igual que las fotos de muestra para aprobación del asesor.
2. **Conteo por línea:** cada casilla lleva su propio conteo final, y quien empacó se registra una sola vez.
3. **La tarjeta del asesor muestra todas las fotos:** una foto por producto o color, cada una con su nombre, su conteo y quién empacó. Cada foto se abre en grande.
4. **Pedidos anteriores:** las fotos que ya se subieron se siguen viendo igual.

## Detalles técnicos

- No hay cambios en la base de datos: cada línea ya tiene su propia orden de producción con `finished_photo_url`, `packager_name` y `final_count`.
- `CompletionDialog.tsx`: recibe las líneas hermanas del pedido (mismo `order_group`, con el mismo helper que usa la tarjeta de aprobación de muestras). Muestra un campo de foto y de conteo por línea, todos obligatorios, y `onConfirm` devuelve `{ orderId, photoUrl, finalCount }[]` más `packagerName`.
- `useProductionOrders.ts`: guarda la foto de cada línea en su propia orden de producción. Solo avanza la etapa de la línea que se está finalizando; las demás solo reciben la foto y el conteo si todavía no los tienen.
- `MisPedidos.tsx` (línea ~644): recorre `completionInfos` completo en lugar de mostrar solo `[0]`, con la etiqueta de producto y color de cada línea.

## Verificación

- Pedido de 2 productos: el diálogo pide 2 fotos, bloquea si falta una y el asesor ve las 2.
- Pedido de 2 colores: igual, una foto por color.
- Pedido de una sola línea: sigue pidiendo 1 foto.
- Pedido antiguo: la foto existente sigue visible. Revisión de tipos.
