# Buscador de pedidos con permisos por rol

Ajustar el buscador global y la ficha de pedido para que cada rol vea solo lo que le corresponde.

## Reglas de visibilidad

| Rol | Qué pedidos ve | Qué información ve |
|---|---|---|
| Asesor comercial | Solo sus pedidos | Ficha completa |
| Admin, contabilidad | Todos | Ficha completa |
| Producción, estampación, logística, inventarios | Todos | Ficha completa (operativa + pagos/estado) |
| Diseño | Todos | Solo diseño: código, estado, marca, cliente (nombre), producto, cantidad, personalización, colores de tinta, logos y su historial. Sin precios, abonos, pagos, facturación, dirección/envío, entregas parciales ni cargos |
| Otros roles (POS feria, punto, community manager, visual/visualizador) | Sin acceso al buscador global | — |

Hoy los asesores ya quedan limitados por su propio listado; el cambio agrega el filtro explícito por rol, la vista reducida de Diseño y ocultar el botón "Buscar pedido" (y el atajo Ctrl/⌘+K) para los roles sin acceso.

## Detalle técnico

- `src/lib/orderAccess.ts` (nuevo): helpers `canSearchOrders(role)` y `getOrderViewScope(role)` devolviendo `"full" | "design" | "own"`, usados por buscador, ficha y badge.
- `OrderSearchDialog.tsx`: sigue leyendo de `useOrders()` (asesor ya filtrado por `advisor_id`). En modo diseño los resultados no muestran saldo/estado de pago, solo estado de producción y etapa de diseño.
- `OrderDetailDialog.tsx`: renderizado condicional de secciones según el scope. En `design` se ocultan Pagos, Facturación, Entregas parciales, Cargos y los campos de dirección/guía dentro de Cliente y despacho; se conserva Producto, logos e historial filtrado a eventos de diseño/estado.
- `OrderCodeBadge.tsx`: el clic abre la ficha solo si el rol puede verla; para roles sin acceso queda solo el botón de copiar en hover.
- `DashboardLayout.tsx`: oculta el botón y desactiva el atajo cuando `canSearchOrders(role)` es falso.
- Sin cambios de base de datos; las RLS existentes siguen siendo la barrera real.
