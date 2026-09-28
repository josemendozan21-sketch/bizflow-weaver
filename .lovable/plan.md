# Fotos de producto finalizado: varias por pedido y por línea

## Qué encontré

Cuando Producción/Empaque finaliza un pedido, el diálogo de finalización (`CompletionDialog`) permite subir **una sola foto** y se guarda en `production_orders.finished_photo_url` (una foto por línea de pedido). Además, la tarjeta del asesor en Mis Pedidos (`MisPedidos.tsx`, línea 644) solo muestra `completionInfos[0]`: la primera foto de la primera línea. Por eso en pedidos de dos productos (gafas + flores) o dos colores, Pilar solo ve una foto.

## Qué se va a hacer

1. **Subir varias fotos al finalizar:** en el diálogo de "Producto finalizado" se podrán adjuntar varias fotos (no solo una), con vista previa y opción de quitar alguna antes de confirmar. Se guardan todas en la orden de producción.
2. **La tarjeta del asesor muestra todas las fotos de todas las líneas:** en vez de solo la primera, se muestra una mini-galería con cada foto, indicando a qué producto/color corresponde (nombre de la línea), más quién empacó y el conteo de cada línea. Cada foto se puede abrir en grande.
3. **Sin cambios de flujo:** Producción sigue finalizando igual; solo gana la opción de adjuntar más fotos. Las fotos ya subidas en pedidos anteriores se siguen mostrando.

## Detalles técnicos

- Migración: agregar `finished_photo_urls text[]` a `production_orders` (o tabla hija `production_order_photos` con `production_order_id`, `photo_url`, `created_at`); backfill desde `finished_photo_url` para no perder lo existente. Mantener `finished_photo_url` como la primera foto por compatibilidad.
- `src/components/production/CompletionDialog.tsx`: input de archivos múltiple, previews, subida secuencial al bucket existente, `onConfirm` recibe `photoUrls: string[]`.
- `src/hooks/useProductionOrders.ts` (`completionData`): guardar arreglo de fotos; registrar cada foto en el historial como hoy.
- `src/components/ventas/MisPedidos.tsx`: `completionInfos` ya agrupa por línea; reemplazar el render de `completionInfos[0]` por un mapeo de todas las líneas y todas sus fotos, con etiqueta de producto/color por línea.

## Verificación

- Finalizar un pedido de prueba con 3 fotos y confirmar que la tarjeta del asesor muestra las 3.
- Pedido de dos líneas (dos colores): cada línea con su foto, todas visibles en la tarjeta.
- Pedido antiguo con una sola foto: sigue mostrándose igual.
- Typecheck.
