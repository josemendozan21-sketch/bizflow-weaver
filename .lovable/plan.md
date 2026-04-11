

## Plan: Limpiar todos los pedidos de prueba

Eliminar todos los registros de prueba de las tablas relacionadas con pedidos para empezar limpio.

### Tablas a limpiar

1. **`production_orders`** — 12 registros (depende de orders, se borra primero)
2. **`orders`** — 13 registros
3. **`notifications`** — 5 registros (limpiar también para no tener notificaciones huérfanas)

### Ejecucion

Se usara el insert tool para ejecutar `DELETE` en este orden:
1. `DELETE FROM production_orders`
2. `DELETE FROM orders`
3. `DELETE FROM notifications`

No se tocan las tablas de inventario (`stock_items`, `body_stock`) ni usuarios.

