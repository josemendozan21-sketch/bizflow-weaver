
## Problema

Hoy "Mis Pedidos" muestra **todos** los pedidos del asesor en una sola lista (pendientes, en producción, listos, despachados, entregados, devueltos) ordenados solo por "necesita acción de pago primero". A medida que se acumulan pedidos, encontrar uno específico se vuelve difícil y la pantalla se vuelve abrumadora.

Además, cada **línea de producto se ve como una tarjeta independiente** (un pedido de 2 colores aparece como 2 tarjetas separadas), lo que duplica visualmente la cantidad de pedidos.

## Propuesta

### 1. Pestañas por estado del pedido

Reorganizar "Mis Pedidos" en 5 pestañas con contador en cada una:

```
[ Acción requerida (3) ] [ En producción (12) ] [ Listos (4) ] [ Despachados (8) ] [ Entregados (24) ]
```

**Distribución:**

- **Acción requerida** — pedidos `listo` de mayor sin `payment_complete` (necesitan que el asesor confirme el pago final). Aparece destacado y solo si hay alguno.
- **En producción** — estados: `pendiente`, `diseno`, `produccion_cuerpos`, `estampacion`, `dosificacion`, `sellado`, `recorte`, `empaque`. Es donde el asesor más entra a ver progreso.
- **Listos** — estado `listo` (ya con pago confirmado o detal). Esperando que logística despache.
- **Despachados** — estado `despachado`. Mostrando guía y transportadora.
- **Entregados** — estado `entregado` o `returned_at` no nulo. Histórico.

La pestaña por defecto al entrar es **"En producción"** (donde está la mayor parte del trabajo activo).

### 2. Agrupación por cliente

Cuando un pedido tiene varias líneas (ej. Miriam Rojas con 2 muelas, Claudia Naranjo con Hueso + Gato), se agrupan en **una sola tarjeta** con el nombre del cliente arriba y las líneas listadas dentro. Total y abono se suman correctamente para ese cliente/grupo.

Criterio de agrupación: mismo `client_name` + `client_city` + `sale_type` + `created_at` redondeado al minuto (mismo formulario de Ventas).

### 3. Buscador y filtros

Encima de las pestañas:

- **Buscador** por nombre del cliente, NIT o producto
- Filtro por **marca** (Magical Warmers / Sweatspot / Todas)
- Filtro por **tipo de venta** (Mayor / Detal / Todas)

### 4. Mejoras de orden

Dentro de cada pestaña los pedidos se ordenan por **fecha de creación descendente** (más nuevos primero). En "En producción" además se puede mostrar la **fecha estimada de entrega** para priorizar visualmente los próximos a vencer.

## Boceto visual

```
┌─────────────────────────────────────────────────────────────┐
│ Mis Pedidos                                                 │
│ ┌─────────────┐                                             │
│ │ Buscar...   │  Marca: [Todas ▾]  Venta: [Todas ▾]        │
│ └─────────────┘                                             │
├─────────────────────────────────────────────────────────────┤
│ [Acción (3)] [Producción (12)] [Listos (4)] [Despachados]  │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Miriam Rojas · Magical · Mayor      [Producción]    │   │
│ │ 300 und · entrega 17 may                             │   │
│ │ • Muela (Frío) — 150 und                             │   │
│ │ • Muela (Frío) — 150 und                             │   │
│ │ Total: $1.614.900 · Saldo: $824.300                  │   │
│ │ [Ver detalle]                                        │   │
│ └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Detalles técnicos

- Editar `src/components/ventas/MisPedidos.tsx`:
  - Añadir estado `activeTab`, `searchQuery`, `brandFilter`, `saleTypeFilter`.
  - Función `groupOrdersByClient(orders)` similar a la que ya existe en `Logistica.tsx` (líneas 86-124) para agrupar líneas hermanas en tarjetas únicas.
  - Función `categorizeOrder(order)` que devuelve `"action" | "production" | "ready" | "dispatched" | "delivered"`.
  - Reemplazar la grilla actual `grid md:grid-cols-2` por el componente `<Tabs>` de shadcn con los conteos en cada `TabsTrigger`.
  - El componente de tarjeta ya existente se reutiliza, solo cambiando el `order` único por un grupo (mostrando líneas listadas).
- No hay cambios de base de datos.
- No afecta otros módulos (Logística, Producción, Contabilidad siguen igual).

## Lo que NO se cambia

- La pestaña de "Aprobaciones de estampación" (`StampingApprovals`) sigue arriba, por encima de las pestañas, porque requiere acción inmediata.
- La lógica de cálculo de saldos, abonos, pagos: se mantiene.
- El formulario de creación de pedidos: sin cambios.
