

## Recompra con ajuste de logo: permitir flujo de diseño opcional

Actualmente al marcar un pedido como **Recompra** en ventas al por mayor, el sistema omite automáticamente la creación de la solicitud de diseño. Esto funciona cuando el cliente reutiliza el mismo logo, pero falla cuando pide un ajuste.

### Cambio propuesto

Agregar una segunda casilla opcional en los formularios de venta al por mayor (Magical Warmers y Sweatspot) que solo aparece cuando **Recompra** está activo:

> ☐ **El cliente solicita ajuste al logo** (enviará el pedido al diseñador)

Comportamiento:
- **Recompra + sin ajuste** → flujo actual: NO se crea `logo_request`, el pedido pasa directo a producción/estampación con el logo anterior. (sin cambio)
- **Recompra + con ajuste** → se crea `logo_request` normal con estado `pendiente_diseno` y el pedido espera aprobación de diseño antes de estampar.
- **Pedido nuevo (no recompra)** → flujo actual sin cambios: siempre crea `logo_request`.

### UI

En `src/pages/Ventas.tsx`, dentro de los formularios `MagicalMayorForm` y `SweatspotMayorForm`:

```text
☑ Es recompra (omitir diseño de logo)
   └─ ☐ Pero el cliente solicita un ajuste al logo
```

La sub-casilla solo se muestra cuando Recompra está marcada y se desactiva/oculta al desmarcarla. Incluye un texto de ayuda breve: *"Marca esta opción si aunque sea recompra, el cliente pidió cambios en el logo (color, tamaño, texto, etc.)"*.

### Lógica

En el handler de envío del pedido al por mayor:

```text
if (!isRecompra || (isRecompra && needsLogoAdjustment)) {
  → createLogoRequestFromOrder(...)
}
```

Es decir, la solicitud de diseño se crea siempre **excepto** cuando es recompra sin ajustes.

### Archivos a modificar

- `src/pages/Ventas.tsx` — agregar estado `needsLogoAdjustment`, el checkbox condicional y actualizar la condición que decide si invocar `createLogoRequestFromOrder`.

### Impacto

- No requiere cambios en la base de datos ni en RLS.
- El flujo del diseñador, asesor y estampación permanece intacto: una vez creada la `logo_request`, sigue el flujo estándar ya implementado.
- Compatible con pedidos multi-línea de Magical Warmers: la bandera aplica a todo el pedido (todas las líneas comparten el mismo logo del cliente).

