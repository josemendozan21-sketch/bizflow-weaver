# Pedidos de Bionovations Direct = pedido creado por un asesor

## 1. Borrar la primera prueba
- Se elimina el pedido **MW-XX-01489** ("PRUEBA WEB - BORRAR"), junto con sus avisos, historial, requisitos y la reserva que se haya generado. Antes de borrar se revisa qué quedó asociado, para que nada del inventario quede descuadrado.
- La segunda prueba (MW-XX-01490) se deja hasta que confirmes que ya se puede borrar.

## 2. Mismo tratamiento que un pedido de asesor
Hoy los pedidos web entran al sistema, pero les faltan pasos que sí ocurren cuando un asesor sube el pedido en Ventas. Se corrige para que cada pedido de Bionovations Direct:

- **Marca correcta**: queda como Magical igual que los pedidos de asesores (hoy entra con un nombre de marca distinto, y eso puede dejarlo fuera de filtros y vistas de Magical).
- **Referencia con tipo**: el producto se guarda como "Antifaz (Frío)" / "(Térmico)", igual que en Ventas. La tienda envía el tipo en un campo aparte.
- **IVA**: precio con o sin IVA, subtotal, IVA calculado y total, con la misma regla del formulario de Ventas.
- **Logo → Diseño**: se copia el archivo del logo al almacenamiento de la plataforma (para que no dependa de la página web), se crea la **solicitud de diseño** en "Pendiente de diseño" ligada al pedido, con nombre del logo, comentarios e instrucciones. Admite varios logos. Si el pedido trae solo texto de personalización sin archivo, Diseño lo arma desde cero, igual que hoy.
- **Recompra**: si se marca que reusa el logo anterior, se registra como logo reutilizado y no crea solicitud de diseño nueva.
- **Avisos**: Inventarios recibe el aviso de pedido nuevo para revisarlo; Estampación y Diseño reciben el aviso de logo nuevo; queda en el historial del pedido de dónde vino el logo.
- **Pago**: fecha de pago, comprobante, referencia y abono repartido entre líneas, como en Ventas.
- **Bajo pedido**: sigue marcado y visible.
- **Sin duplicados**: se mantiene.

Luego se corrigen los dos pedidos de prueba ya recibidos para que queden con la marca correcta, y se repite la prueba: un pedido nuevo con logo debe aparecer en Diseño, en Inventarios y en Estampación igual que uno creado por Pilar o Ángela.

## 3. Lo que debe ajustar la tienda web (Bionovations Direct)
Te paso la lista exacta de campos nuevos u opcionales: `type` (Frío/Térmico) por línea, `price_includes_tax`, `payment_date`, `logos[]` (nombre + enlace), `reuse_previous_logo`, `is_recompra`. Los campos actuales siguen funcionando.

## Detalles técnicos
- `receive-bionovations-wholesale-order`: `brand='magical'`; `product = "${name} (${type})"`; IVA con la misma regla de `computeIva/prorateIva` (19%) replicada en la función; `subtotal_amount`, `tax_rate`, `tax_amount`, `price_includes_tax`, `payment_date`, `logos` jsonb, `logo_source*` meta.
- Descarga del logo por URL (http/https, límite de tamaño) y subida al bucket `logo-files/originals/`; insert en `logo_requests` (`brand 'Magical Warmers'`, `status 'pendiente_diseno'`, `order_id` de la primera línea, `advisor_id` del asesor del sistema).
- Notificaciones replicando `createOrderNotifications` (inventarios) y `notifyLogoFlow` (estampación/diseño) + fila en `order_change_log` para `logo_source`.
- Corrección de datos: `brand` de los pedidos del asesor del sistema a `magical`; borrado de MW-XX-01489 y filas dependientes (notifications, order_change_log, order_requirements, order_reservations, process_audit_log según existan).
