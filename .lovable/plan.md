# Diferenciar producto marcado (con logo) y sin marcar en inventario

## Situación actual (verificada)

- La base de datos ya tiene un campo `logo` en los productos, pero solo se usa a medias:
  - Sweatspot producto terminado: 52 referencias marcadas y 26 sin marcar. La tabla agrupa "Sin logo / Con logo", pero **no se puede cambiar** el estado de una referencia ya creada, ni crear la contraparte desde la misma fila.
  - Magical Warmers producto terminado: las 87 referencias están sin ese dato. No hay forma de indicar si están marcadas.
- El "Historial de cambios" nuevo **no registra** cambios en el marcado: el registro automático solo vigila disponible, en proceso, nombre, marca, categoría, tipo, mínimo, unidad y color.
- Los movimientos de entrada/salida no guardan si lo que entró o salió estaba marcado, así que la trazabilidad no lo distingue.
- El formulario de movimientos rápidos sí filtra "Con logo / Sin logo", pero solo para Sweatspot.

## Qué voy a hacer

### A. El marcado como atributo real del producto (Magical y Sweatspot)
- En crear y editar referencia aparece el campo **Marcado**: "Sin marcar" o "Marcado (con logo)". Disponible para producto terminado de ambas marcas.
- Se puede **cambiar el marcado de una referencia existente** desde el botón de editar, sin tener que borrarla y volverla a crear.
- Etiqueta visible en la tabla (badge "Marcado" / "Sin marcar") y filtro para ver solo marcados, solo sin marcar o todo.
- En la vista de Sweatspot, desde una fila que solo tiene una de las dos variantes, un botón crea la variante faltante con la misma referencia, color y origen.
- El buscador reconoce "marcado", "con logo" y "sin logo".

### B. Pasar unidades de "sin marcar" a "marcado"
Como el producto se marca físicamente (estampación), se agrega la acción **Marcar unidades**: se indica cuántas unidades pasan de la variante sin marcar a la marcada. El sistema descuenta de una y suma a la otra en un solo paso, con validación de que haya stock suficiente. Queda registrado como movimiento y en el historial de cambios.

### C. Trazabilidad completa
- El registro automático e inmutable pasa a vigilar también el campo de marcado: quién lo cambió, de qué a qué, y cuándo.
- El "Historial de cambios" muestra una columna de marcado y permite filtrar por marcado / sin marcar; se incluye en el Excel.
- Los movimientos de inventario guardan el estado de marcado del ítem, y la pestaña de Trazabilidad lo muestra y lo filtra, además de incluirlo en su exportación.
- Las entradas y salidas rápidas muestran el marcado en el nombre del ítem para ambas marcas (hoy solo Sweatspot).

### D. Consistencia de datos
- Los valores existentes se respetan: cualquier valor guardado hoy sigue contando como "marcado". Las nuevas escrituras usan un valor único y consistente para evitar variantes de texto.
- No se crean ni se borran referencias automáticamente; los 87 productos de Magical quedan como "Sin marcar" y el equipo de Inventarios ajusta los que correspondan (cada ajuste queda auditado).

## Detalles técnicos

- Migración: añadir columna `logo` a `inventory_audit_log` y `logo` a `inventory_movements`; extender el array de campos vigilados de `log_inventory_change()` con `logo` y `sweatspot_category`, e incluir el valor de marcado como contexto en cada fila del log. Sin cambios de RLS (se reutilizan las políticas actuales).
- Frontend:
  - `CategorizedInventoryPanel.tsx`: campo Marcado en alta y edición, badge, filtro tri-estado, búsqueda.
  - `SweatspotFinishedProducts.tsx`: edición del marcado, creación de la variante faltante y acción "Marcar unidades".
  - `QuickMovementForm.tsx` / `RegisterMovementDialog.tsx`: filtro y etiqueta de marcado para ambas marcas; persistir `logo` en el movimiento.
  - `InventoryChangeLogPanel.tsx` e `InventoryTraceabilityPanel.tsx`: columna, filtro y columna en Excel.
  - `useInventory.ts`: normalizar el valor escrito (`'marcado'` o `null`) y exponerlo en los tipos.
- No se toca la lógica de pedidos ni el flujo de estampación existente; "Marcar unidades" es un ajuste de inventario, no un pedido.
