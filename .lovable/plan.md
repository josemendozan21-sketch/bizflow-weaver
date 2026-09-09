# IVA 19% en precios al por mayor (Magical y Sweatspot)

Se agrega la condición de IVA a la lógica de precios que ya existe. No se crea un sistema de precios nuevo ni se cambian las reglas actuales de líneas, obsequios, abonos, envío o costos adicionales.

## Qué verá el asesor

En el bloque de precios del formulario al por mayor (Magical y Sweatspot), junto a Unidades / Valor unitario / Valor total, aparece un selector de dos opciones:

- **Sí, incluye IVA** (opción por defecto, igual que hoy)
- **No, no incluye IVA**

La elección aplica al pedido completo (todas las líneas de esa venta), ya que hoy el precio se maneja por línea pero el total y el abono se calculan para todo el pedido.

Debajo del total aparece un desglose:

```text
Subtotal productos      $1.000.000
IVA 19%                   $190.000
Cobro de logo / molde      $50.000
Total del pedido        $1.240.000
```

Cuando se elige "Sí, incluye IVA" el desglose muestra IVA $0 y el total no cambia respecto de hoy.

## Reglas de cálculo

- Base del IVA = suma del valor de los productos (líneas no obsequio) únicamente.
- Quedan **fuera** de la base: envío, cobro de logo, molde y costos adicionales.
- Sin IVA: IVA = base × 19 %; total = base + IVA + otros conceptos (como hoy).
- Con IVA incluido: no se agrega nada; el total es exactamente el de hoy.
- El envío sigue con su lógica actual (contraentrega / por cobrar / incluido en anticipos) y nunca entra en la base del IVA.
- El abono, el prorrateo entre líneas y el saldo pendiente siguen usando el total final, sin cambios de fórmula.

## Comisiones

La comisión se calcula sobre el valor sin IVA: al valor del pedido se le resta el IVA registrado, igual que hoy ya se restan el envío y los cargos adicionales. Los pedidos históricos quedan marcados como "precio con IVA incluido" con IVA $0, así que ninguna comisión ya calculada cambia.

## Pedidos existentes

Todos los pedidos actuales se marcan como "precio con IVA incluido" con IVA $0. Ningún valor histórico se modifica.

## Detalles técnicos

**Base de datos** (una migración, sin tocar datos existentes salvo el valor por defecto):
- `orders.price_includes_tax boolean not null default true`
- `orders.tax_rate numeric not null default 0`
- `orders.tax_amount numeric not null default 0`
- `orders.subtotal_amount numeric` (base de productos de esa línea, informativa)
- Backfill implícito por los defaults: filas existentes quedan con IVA incluido e IVA 0.

**Frontend** (`src/pages/Ventas.tsx`):
- Estado `mwPriceIncludesTax` / `ssPriceIncludesTax` con `usePersistedState`, como el resto del formulario.
- `grandTotal` de cada formulario suma `taxAmount` calculado solo sobre `linesSum` (excluye `costoAdicional`, `costoLogo`, `moldeCosto`). Es el único punto de cambio del total, para no duplicar cálculos.
- En el insert de cada línea: `subtotal_amount` = base de la línea, `tax_amount` = IVA prorrateado por línea con el residuo a la última línea con valor (mismo patrón ya usado para el abono), `total_amount` = base + IVA de la línea + extras de la primera línea. `unit_price` se sigue guardando tal como lo digita el asesor.
- Resúmenes de confirmación (`buildMagicalMayorSummary`, `buildSweatspotMayorSummary`) muestran Subtotal, IVA 19 % y Total.

**Comisiones** (`src/lib/commissions.ts`): la base de comisión resta `tax_amount` además de `shippingCost` y `extraCharges`; se añade `taxAmount` a la línea de detalle y a la leyenda de `MisComisiones`.

**Visualización**: `OrderDetailDialog` y el detalle de `MisPedidos` muestran la fila de IVA cuando `tax_amount > 0`.

## Validación

1. $1.000.000 con IVA incluido → IVA $0, total $1.000.000.
2. $1.000.000 sin IVA → IVA $190.000, total $1.190.000.
3. Caso 2 + envío $100.000 registrado después → IVA sigue en $190.000; el envío suma al saldo según su modo.
4. Caso 2 + costo adicional $50.000 → IVA $190.000 (no $199.500), total $1.240.000.
5. Varias líneas: la suma de `tax_amount` por línea es exactamente el IVA del pedido.
6. Comisión de un pedido sin IVA se calcula sobre $1.000.000.
