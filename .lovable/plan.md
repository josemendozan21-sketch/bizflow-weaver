

## Agrupar pedidos por cliente en Logística

Actualmente cada producto aparece como una fila independiente, lo que provoca que se confundan o se pierdan envíos cuando un mismo cliente tiene varios items. Voy a agruparlos en **una sola tarjeta por cliente** (consolidando por cliente + ciudad + dirección + tipo de venta).

### Cambios en `/logistica`

**Pestaña "Listos para despacho"**
- Reemplazar la tabla actual por **tarjetas agrupadas**, una por cliente/envío.
- Cada tarjeta mostrará:
  - Encabezado: nombre del cliente, ciudad, marca(s), tipo (Por mayor / Por menor), total de unidades y total de items.
  - Lista interna de productos: `Producto (variante) — N unidades — estado de pago`.
  - Un solo checkbox que selecciona todos los items del cliente.
  - Un solo botón **"Rótulo"** (genera un único rótulo consolidado con todos los productos del envío).
  - Un solo botón **"Despachar"** que marca todos los items del grupo como despachados con la misma transportadora y guía.

**Pestaña "Pendientes"**
- Misma lógica de agrupación: una fila por cliente que expanda los productos pendientes, con resumen de unidades y antigüedad del pedido más viejo del grupo.

**Pestaña "Despachados"**
- Agrupar por cliente + número de guía (los items despachados juntos comparten transportadora/guía), mostrando un único registro consolidado del envío.

### Lógica de agrupación

Clave de grupo: `client_name + client_city + client_address + sale_type`. Esto evita mezclar dos envíos distintos del mismo cliente a direcciones diferentes.

### Acciones masivas por grupo

- **Rótulo consolidado**: un solo rótulo por grupo listando todos los productos y unidades, en lugar de N rótulos separados.
- **Despachar grupo**: el diálogo de despacho se abre una vez y aplica la misma transportadora + guía a todos los `order.id` del grupo (loop sobre `supabase.from("orders").update(...)`).
- **Selección múltiple de grupos**: el botón "Descargar rótulos (N)" seguirá funcionando, pero N será el número de **envíos** seleccionados, no de items.

### Detalles técnicos

- Crear helper `groupOrdersByShipment(orders)` en `src/pages/Logistica.tsx` que devuelve `Array<{ key, clientName, city, address, saleType, brands: Set, items: Order[], totalUnits, allIds: string[] }>`.
- Reescribir las tres tablas (`ready`, `pending`, `dispatched`) usando este agrupador.
- Adaptar `generateLabelsForOrders` para aceptar grupos y generar **un rótulo por grupo** que liste todos los productos en una sección "Contenido del envío".
- Adaptar `DispatchDialog` (o crear `DispatchGroupDialog`) que reciba `orderIds: string[]` y aplique el update a todos.
- `selectedIds` pasará a ser `selectedGroupKeys: Set<string>`.

### Resultado visual

```text
┌─────────────────────────────────────────────────────────────┐
│ ☐  Lizeth Sepúlveda · Medellín · Por menor   [Rótulo][Desp]│
│    Magical Warmers · 4 items · 6 unidades                   │
│    ─────────────────────────────────────────────────────    │
│    • Handy (Térmico)        1 und   N/A                     │
│    • Pocket (Térmico)       3 und   Pagado                  │
│    • Pocket (Frío)          1 und   N/A                     │
│    • Gorro (Frío)           1 und   Pagado                  │
└─────────────────────────────────────────────────────────────┘
```

