# Entrada de pedidos mayoristas web + inventario Magical en la conexión web

## 1. Nuevo asesor "Bionovations Mayorista Web"
- Asesor del sistema propio, separado de "Magical Warmers Web" (que sigue igual, para ventas al detal).
- Sus pedidos aparecen en Ventas, Producción, Logística y Comisiones con ese nombre, como venta **al por mayor** de Magical Warmers.
- No genera comisión (es un canal web, no una persona).

## 2. Nueva entrada de pedidos mayoristas
Una dirección propia, protegida con su propia clave compartida. Acepta:
- Cliente (nombre, NIT, teléfono, correo, dirección, ciudad).
- Uno o varios productos por pedido: referencia, cantidad, precio unitario.
- **Doble tinta**: número de tintas (1 a 3) y colores de tinta 1, 2 y 3.
- **Color de escarcha**, **color de silicona** y color de gel.
- **Logo**: enlace al archivo (uno o dos logos) y nombre del logo; entra al flujo de Diseño como cualquier pedido mayorista con logo.
- **Referencia de pago**: método, referencia/número de transacción, comprobante, abono y si está pagado completo.
- **Aviso "bajo pedido"**: queda marcado en el pedido y visible para Producción e Inventarios; el pedido entra a producción normal (no como "listo").
- **Sin duplicados**: si llega otra vez el mismo identificador externo, devuelve el pedido ya creado sin crear otro.

Respuesta: número de pedido, identificador interno y si fue duplicado.

## 3. Conexión de inventario web ampliada
La conexión actual (consultar, reservar, confirmar, liberar, vencer) se mantiene igual para Sweat Spot y se amplía:
- **Consultar** permite filtrar por marca (Sweat Spot / Magical) y por tipo: referencias de producto, gel, silicona, tintas y escarchas.
- Cada resultado indica marca, categoría, tipo (frío/térmico), color, unidad y disponible.
- **Reservar / confirmar / liberar** funcionan igual para referencias Magical y materias primas (con cantidades decimales para materias primas por peso o volumen).
- Las mismas reglas de seguridad: sin clave, "no autorizado"; sin existencias, se rechaza sin mover nada.

## 4. Entrega
- Te doy la dirección de la nueva entrada y la de inventario, con un ejemplo de pedido.
- **Clave compartida**: por seguridad no puedo escribirla en el chat. Te aparecerá un formulario seguro con un botón "Generar" y otro para copiarla; la copias en la configuración de la tienda web y queda guardada aquí al mismo tiempo.
- Prueba completa: pedido nuevo, reenvío con el mismo identificador (sin duplicar), consulta de escarchas/gel y una reserva liberada al final para que el inventario quede igual.

## Detalles técnicos
- Migración: insertar el asesor del sistema (perfil + rol `asesor_comercial`, UUID fijo), agregar a `orders` `is_made_to_order boolean default false`, `payment_reference text`, y (si faltan) `ink_count`, `ink_color_2`, `ink_color_3`, `glitter_color`; índice único parcial en `orders(external_order_id)` para dedupe a nivel de base.
- Edge function nueva `receive-bionovations-wholesale-order`, `sale_type='mayor'`, `brand='magical_warmers'`, secreto `BIONOVATIONS_WEBHOOK_TOKEN` pedido con `add_secret` (`generate: true`); multi-línea con `order_code` compartido usando los triggers existentes de códigos y requisitos.
- `web_check_availability`: nueva versión con parámetros opcionales `_brand`, `_categories`, `_kind` (gel/silicona/tinta/escarcha por categoría `materia_prima` + prefijo de nombre); devuelve también `product_type`, `color`, `unit`.
- `sweatspot-inventory`: pasar los nuevos filtros; reservas con `numeric` ya soportan decimales.
- Excluir al asesor del sistema de cálculos de comisión en `src/lib/commissionSettlement.ts`; mostrar "Bajo pedido" y referencia de pago en tarjetas de Ventas/Producción.
