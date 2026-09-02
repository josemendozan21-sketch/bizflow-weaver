# Conciliación de pedidos en $0 y disputas de comisión

## Problema

En la vista de Contabilidad del asesor aparecen pedidos facturados con monto **$0** (ej. Sebastián Peralta, Marlon Quintero). Esos pedidos no aportan comisión y hoy no hay forma de filtrarlos ni de pedir su corrección: el asesor pierde comisión y no queda rastro del reclamo.

## Qué se va a construir

### 1. Filtros por monto en las listas de pedidos
En las pestañas Pendientes, Facturar y Facturados de Contabilidad (mismo comportamiento para asesor y contabilidad):
- Buscador por número de pedido o cliente.
- Filtro de monto: Todos / **En $0 o sin valor** / Menores a un valor / Rango desde–hasta.
- Contador visible de "Pedidos en $0" con acceso directo a ese filtro.
- Los pedidos en $0 se marcan con una etiqueta ámbar "Sin valor" en la tabla.

Los mismos filtros se agregan en Mis Comisiones (Ventas), donde ya existe la lista de excluidos.

### 2. Flujo de conciliación: el asesor propone, contabilidad aprueba
Nueva funcionalidad de **disputas de pedido**:

- En cualquier pedido con monto en $0 o discrepante, el asesor abre "Solicitar corrección": indica el valor correcto propuesto, el motivo y puede adjuntar soporte.
- La solicitud queda en estado **pendiente** y notifica a Contabilidad.
- Contabilidad ve una pestaña **Conciliación** con todas las solicitudes: pedido, asesor, valor actual, valor propuesto, motivo, soporte.
- Contabilidad **aprueba** (se actualiza el valor del pedido, se recalculan saldo y comisión, se registra en el historial de cambios) o **rechaza** con comentario.
- El asesor ve el estado de cada solicitud y la respuesta.
- Todo queda en historial: quién propuso, quién resolvió, cuándo y con qué valores.

### 3. Prevención: no se pueden crear pedidos en $0
- Al crear o editar un pedido, el sistema **bloquea el guardado** si el valor total queda en $0 o vacío.
- Única excepción: marcar explícitamente el pedido como **Obsequio / Muestra**, que sí puede ir en $0 y queda excluido de comisión con ese motivo claro.
- Mensaje de error explícito indicando que falta precio unitario o valor total.

### 4. Panel de pedidos históricos sin valor
Un aviso en Contabilidad y en Mis Comisiones que lista los pedidos existentes en $0 (los ya creados antes del bloqueo) para que se corrijan o se marquen como obsequio, y desaparezcan del listado a medida que se resuelven.

## Detalles técnicos

- Nueva tabla `order_value_disputes`: `order_id`, `requested_by`, `current_amount`, `proposed_amount`, `reason`, `evidence_url`, `status` (pendiente/aprobada/rechazada), `resolved_by`, `resolution_note`, `resolved_at`. RLS: el asesor ve y crea las suyas; admin y contabilidad ven todas y resuelven. GRANTs a `authenticated` y `service_role`.
- Al aprobar: actualización de `orders.total_amount` (y `unit_price` derivado si aplica) vía función `security definer`, registro en `order_change_log` y notificación al asesor.
- Frontend: `useOrderDisputes.ts`, `OrderDisputeDialog.tsx`, `DisputesPanel.tsx` (pestaña Conciliación en `Contabilidad.tsx`), filtros de monto en `Contabilidad.tsx` y `MisComisiones.tsx`.
- Validación de $0 en el formulario de creación/edición de pedidos (Ventas) con la excepción de obsequio; se usa el campo `payment_method = "obsequio"` ya existente.
- El motor de comisiones (`commissions.ts`) ya clasifica los $0 como excluidos; se añade el motivo "pendiente de valorizar — solicitar corrección".

## Fuera de alcance

- Cambios en porcentajes o política de comisiones.
- Corrección masiva automática de los 17 pedidos históricos en $0 (se listan para resolución manual).
