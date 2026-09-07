# Por qué esos pedidos se quedan ahí (y cómo dejar de verlos)

Revisé los pedidos que aparecen en el aviso de Producción. Son 19 y ninguno depende del asesor.

## Qué está pasando (verificado en datos)

Un pedido solo entra a Producción cuando **Inventarios** lo abre en su bandeja de pedidos al por mayor y elige "entregar desde stock" o "solicitar producción". Mientras eso no ocurre, el pedido queda en "pendiente" y el aviso de Producción lo muestra como "Sin orden de producción". El asesor ya hizo su parte (pedido creado, abono y soporte cargados en la mayoría).

De los 19 que se ven hoy:

- **6 son los viejos que "ya salieron"**: Inventarios ya los atendió y los movió a "Entregados recientes" el 21–26 de agosto (A Tu Salud Vargas, Unitraumax, Dr. Manuel Moreno, Mónica Ocejo, Natalia Rodríguez, Pulpo Lab). Nunca se les cerró el estado del pedido, así que siguen figurando como pendientes en Producción.
- **13 sí están realmente esperando a Inventarios**, algunos desde el 12 de agosto: Win Sports, Distrisánchez (3), Laura Bejarano, AMPM, Kiara Gómez (2), Margarita Gallego, Ópticas Prisma Visión (2), Daniel Macías, Vengoechea Group.

## Qué se va a hacer

**1. Que no reaparezcan los ya atendidos**
El aviso dejará de listar los pedidos que Inventarios ya cerró; pasarán a un bloque aparte "Ya atendidos por Inventarios" (plegado) para que quede el rastro sin ensuciar la lista.

**2. Cerrar los 6 viejos**
Se les actualiza el estado a entregado/atendido, con nota de que Inventarios ya los despachó, para que salgan de la lista de pendientes en todas las vistas.

**3. Decir claramente de quién es la pelota**
Cada pedido pendiente mostrará "Esperando a Inventarios" con los días de espera y semáforo (verde <2 días, ámbar 2–5, rojo >5), en vez del texto técnico "Sin orden de producción". Así Producción sabe que no debe pedirle nada al asesor.

**4. Avisar a Inventarios**
Notificación automática a Inventarios por cada pedido aprobado que lleve más de 2 días sin rutear, una sola vez por pedido, más un contador visible en su bandeja.

## Detalle técnico

- `src/components/production/OrderSyncHealthPanel.tsx`: excluir del listado principal las órdenes con `inventory_archived_at`; sección colapsable para ellas; reemplazar el problema "Sin orden de producción" por "Esperando ruteo de Inventarios" con antigüedad calculada sobre `created_at` y badge por color.
- `src/components/production/UnroutedOrdersPanel.tsx`: mismo criterio de exclusión y mismo semáforo, para que ambos paneles cuenten lo mismo.
- Datos: actualizar `production_status` de los 6 pedidos archivados por Inventarios (MW-IH-00990, MW-IH-00991, MW-IH-00995, MW-PB-01003, SW-VM-01057, MW-AM-01073) a estado entregado, sin tocar pagos ni comisiones.
- Notificación: al cargar la bandeja de Inventarios, insertar en `notifications` (`target_role: 'inventarios'`) un aviso por pedido sin `production_orders` con más de 2 días, deduplicado por `reference_id`.

Sin cambios de esquema ni de permisos.
