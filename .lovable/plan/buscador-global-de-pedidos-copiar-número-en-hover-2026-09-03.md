# Buscador global de pedidos + copiar número en hover

## Objetivo
1. Poder buscar cualquier pedido desde cualquier vista y ver TODO su detalle en un solo lugar (estado, producción, pagos/abonos, entregas, logos, historial).
2. Que el número de pedido se vea igual en toda la plataforma y muestre el botón de copiar al pasar el mouse.

## 1. Buscador global de pedidos
- Nuevo botón "Buscar pedido" en la barra superior del layout (visible en todas las páginas), con atajo de teclado Cmd/Ctrl + K.
- Abre un cuadro de búsqueda tipo comando: se escribe número de pedido, cliente, NIT, producto, asesor o marca; usa la búsqueda ya existente que ignora tildes y guiones (`SW-VM-01155`, `sw vm 1155`, "angela").
- Resultados en lista: número de pedido, cliente, producto, cantidad, estado de producción y estado de pago. Al hacer clic se abre el detalle completo.
- Respeta permisos: el asesor solo ve sus pedidos (igual que hoy en la consulta de pedidos); los demás roles ven todo.

## 2. Ficha única de detalle del pedido
Un diálogo reutilizable, abierto desde el buscador (y desde el número de pedido en cualquier vista):
- **Cabecera**: número de pedido (con copiar), marca, cliente, asesor, fechas.
- **Estado**: etapa de producción, fecha de entrega, despacho (transportadora/guía), entregas parciales (entregado vs pendiente).
- **Dinero**: total, abonos, saldo, si está pagado, método, crédito y fecha de vencimiento, cargos adicionales, factura.
- **Historial de pagos**: lista de abonos con fecha, monto, método y soporte.
- **Producto**: producto, cantidad, colores (tinta/gel/silicona/escarcha), personalización, observaciones, logos.
- **Historial de cambios** del pedido (panel ya existente).
Todo en modo lectura; las acciones siguen en sus áreas actuales.

## 3. Copiar número en hover, en todas las vistas
- Ajustar el distintivo de número de pedido para que el ícono de copiar aparezca al pasar el mouse (y siempre en móvil), manteniendo el aviso de "copiado".
- Reemplazar por ese distintivo los sitios donde hoy el número se muestra como texto plano: Logística (detalle), Mis Pedidos (detalle e impresión en pantalla), Contabilidad (créditos, disputas, comisiones), Comisiones del asesor.
- Al hacer clic en el número también se podrá abrir la ficha de detalle (clic = abrir, ícono = copiar).

## Detalles técnicos
- Nuevo `src/components/common/OrderSearchDialog.tsx` (basado en `cmdk`/`Command` de shadcn) y `src/components/common/OrderDetailDialog.tsx`; disparador en `DashboardLayout.tsx`.
- Datos: `useOrders()` existente (ya filtra por rol), `useOrderPayments`, `useOrderDeliveries`, `useOrderCharges`, `useOrderChangeLog`; filtrado en cliente con `matchesQuery` de `src/lib/search.ts`.
- `OrderCodeBadge` gana props opcionales `onOpenDetail` y estilos `group-hover` para el ícono de copiar; sin cambios de lógica de negocio.
