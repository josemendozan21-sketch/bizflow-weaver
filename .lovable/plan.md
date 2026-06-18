## Objetivo

Simplificar el flujo de la bandeja de **Sweatspot al por mayor** en `WholesaleOrdersInbox.tsx`: solo dos acciones por pedido — **Entregar termos (para marcar)** o **Salir kit** — y mostrar siempre el color del termo para que el descuento de stock sea el correcto.

## Cambios

### 1. Tarjeta de pedido Sweatspot mayor (`renderCard`)

- Quitar el botón `Entregar terminado` para la rama `isSweatspotMayor`.
- Dejar solo dos botones:
  - **Entregar termos (para marcar)** → abre el diálogo con `target: "terminado"` pero buscando en `producto_terminado` **SIN LOGO** (logo IS NULL) filtrando por `silicone_color` y tamaño del producto. Variante `default` si hay stock suficiente, `outline` si no.
  - **Salir kit** → `target: "estampacion"` (flujo actual de kit, sin cambios).
- Badge de color del termo (silicona) visible al lado del nombre del producto, con un swatch de color cuando el color sea reconocible (rosado, transparente, blanco, negro, etc.). Mostrar también el badge `SIN LOGO` para el stock encontrado.
- Reemplazar el badge "Entrega por kit" por uno que resuma el stock SIN LOGO disponible vs cantidad pedida (verde si alcanza, ámbar si parcial, rojo si cero).

### 2. Búsqueda de stock por color/tamaño/logo

- Nueva helper `findSweatspotMarkableStock(order)` que filtra `stockItems` donde:
  - `brand === "sweatspot"`
  - `category === "producto_terminado"`
  - `logo` es null/vacío (marcables)
  - `color` coincide con `order.silicone_color` (case-insensitive, ignorando tildes)
  - el nombre contiene el tamaño del producto (150 / 250 / 500 ml) cuando aplique
- Devolver el ítem candidato + total disponible. Usar este helper para el badge y para el movimiento de inventario.

### 3. Diálogo de entrega (`Entregar termos`)

- Cuando `delivering.target === "terminado"` y la marca es `sweatspot`:
  - Mostrar el color del termo (swatch + nombre) y el ítem SIN LOGO al que se va a descontar.
  - Si no se encuentra ítem SIN LOGO que coincida, bloquear el botón "Confirmar" con mensaje claro ("No hay termos SIN LOGO de color X en stock — usa Salir kit").
  - Al confirmar, el `inventory_movements` se inserta con `stock_item_id` del ítem SIN LOGO y `area: "estampacion"` (no logística — porque solo van a marcarse), con `reason: "Entrega termos SIN LOGO para marcación — Pedido de <cliente>"`.

### 4. Rama no-Sweatspot mayor

- No tocar. Se queda con su flujo actual (`Entregar terminado` + `Personalizar — Estampar` / `desde cero`).

## Detalles técnicos

Archivos:

- `src/components/inventory/WholesaleOrdersInbox.tsx` — única edición.

Sin migraciones ni cambios de schema. Sin cambios en POS, ventas ni logística.

## Verificación

1. Pedido Sweatspot mayor con `silicone_color = "Rosado"` y producto `TERMO 250 ML`: la tarjeta muestra badge rosado + cantidad disponible SIN LOGO; "Entregar termos" descuenta de `TERMO 250 ROSADO SIN LOGO`.
2. Pedido Sweatspot mayor sin stock SIN LOGO del color: badge rojo, botón "Entregar termos" deshabilitado o en `outline` y "Salir kit" como acción principal.
3. Pedido no-Sweatspot al por mayor: la tarjeta mantiene sus 3 acciones actuales (sin regresión).
