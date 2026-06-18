## Cambio en bandeja de pedidos al por mayor

**Objetivo:** Que los pedidos al por mayor de marcas distintas a Sweatspot (Magical Warmers, etc.) muestren solo 2 botones: **Mandar a producir cuerpos** y **Personalizar — Estampar**. Sweatspot sigue como está (Entregar termos + Salir kit).

### Archivo a editar
`src/components/inventory/WholesaleOrdersInbox.tsx` — rama `else` del `renderCard` (líneas ~654–684).

### Detalle de los botones para Magical mayor

1. **Mandar a producir cuerpos** → abre `openDeliver(o, "produccion")`. Ícono `Factory`. Es el botón primario cuando NO hay cuerpos suficientes; secundario si ya hay.
2. **Personalizar — Estampar** → abre `openDeliver(o, "estampacion")`. Ícono `Paintbrush`. Es el botón primario cuando hay cuerpos disponibles (`enough`) o cuando ya fue marcado como `producedReady`; secundario en caso contrario.
3. Se elimina por completo el botón **Entregar terminado** (y el badge/stock asociado a producto terminado en la tarjeta para no-Sweatspot).
4. Se conserva el botón `X` para archivar.

### Lógica de "primario vs secundario"

- Si `producedReady || enough` (hay cuerpos listos en stock): "Personalizar" es `variant="default"`, "Mandar a producir" es `variant="outline"`.
- Si no hay cuerpos suficientes: "Mandar a producir" es `variant="default"`, "Personalizar" es `variant="outline"`.

### Badge de stock en la tarjeta (no-Sweatspot)

Cambiar el `stockBadge` para no-Sweatspot: mostrar disponibilidad de **cuerpos/referencias** (lo que mide `enough`) en lugar de producto terminado. Verde si alcanza, ámbar si parcial, rojo si nada.

### No tocar

- Rama `kind === "detal"`.
- Rama `isSweatspotMayor` (Sweatspot intacto).
- `confirmDeliver`, `findSweatspotMarkableStock`, kit Sweatspot, diálogo, migraciones.