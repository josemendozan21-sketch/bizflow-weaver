## Ocultar "Mandar a producir cuerpos" cuando hay stock suficiente (Magical mayor)

**Archivo:** `src/components/inventory/WholesaleOrdersInbox.tsx`

### Problema
En los pedidos al por mayor de Magical (y otras marcas no-Sweatspot), el botón **Mandar a producir cuerpos** aparece incluso cuando el badge indica stock suficiente (ej. Stock: 662 para un pedido de 100 unidades). El usuario reporta que solo debería verse ese botón cuando NO hay stock o el stock es insuficiente.

### Cambio
En la rama `else` del `renderCard` (líneas ~654-672, pedidos mayor no-Sweatspot), envolver el botón "Mandar a producir cuerpos" en una condicional `{!enough && (...)}` para que solo se renderice cuando `enough === false`.

**Resultado esperado:**
- `enough === true` (hay cuerpos suficientes o ya fueron producidos): solo aparece **Personalizar — Estampar** + botón X.
- `enough === false` (sin stock o stock parcial): aparece **Personalizar — Estampar** (outline) + **Mandar a producir cuerpos** (default) + botón X.

Sin cambios en Sweatspot mayor, detal, badges de stock, ni diálogos.