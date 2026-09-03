# Reajuste de permisos del buscador de pedidos

Cambia el alcance de Producción y Estampación: dejan de ver la ficha completa y pasan a una vista operativa sin información comercial.

## Reglas de visibilidad

| Rol | Pedidos que ve | Información |
|---|---|---|
| Admin, contabilidad, inventarios | Todos | Ficha completa |
| Logística | Todos | Ficha completa (necesita dirección, guía y estado de pago para despachar) |
| Asesor comercial | Solo los suyos | Ficha completa |
| Producción, estampación | Todos | Vista operativa: código, estado de producción, marca/tipo, cliente (nombre y ciudad), fecha de entrega, producto, cantidad, avance de entrega, personalización, colores (tinta, gel, silicona, glitter), logos, observaciones e historial de cambios operativos. Sin precios, abonos/pagos, facturación, dirección, guía ni entregas parciales con valores |
| Diseño | Todos | Vista de diseño (como quedó): producto, cantidad, personalización, colores, logos e historial de diseño |
| Otros roles (POS feria, punto, community manager, visual/visualizador) | Sin acceso al buscador | — |

## Detalle técnico

- `src/lib/orderAccess.ts`: agregar el scope `"operations"`; `produccion` y `estampacion` salen de `FULL_ROLES`. `canSeeOrderFinancials` sigue siendo verdadero solo para `full`.
- Filtro de historial: nuevo conjunto de campos para `operations` (estado de producción, etapas, producto, cantidad, colores, logos, personalización, fecha de entrega, observaciones) además del ya existente para diseño.
- `OrderDetailDialog.tsx`: reemplazar la condición binaria `designOnly` por el scope; ocultar Pagos, Facturación, Cargos y Entregas parciales para `operations` y `design`, y en `operations` mostrar Cliente con nombre, ciudad, fecha y estado de despacho (sin dirección, teléfono, correo ni guía).
- `OrderSearchDialog.tsx`: los badges de saldo/pagado solo en scope `full` (ya implementado vía `canSeeOrderFinancials`).
- Sin cambios de base de datos.
