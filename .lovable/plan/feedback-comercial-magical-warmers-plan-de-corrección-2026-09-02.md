# Feedback Comercial Magical Warmers — plan de corrección

Seis frentes reportados por Pilar. Abajo va lo que ya se verificó en el sistema y qué se hará en cada punto.

## Hallazgos verificados

- **Abonos (punto 4): causa confirmada.** Al crear el pedido, el abono se guarda directamente en el pedido, pero no queda registrado como "pago". Hoy hay **710 pedidos con abono y cero pagos registrados**. Cuando el asesor agrega un abono nuevo desde la app, un proceso automático **reemplaza** el abono del pedido por la suma de los pagos registrados; como el abono inicial nunca se registró, el valor cae (ej.: $500.000 → $150.000). Además, en pedidos de varias líneas el abono se reparte proporcionalmente entre líneas, así que cada tarjeta muestra solo una fracción.
- **Logos atascados (punto 1): causa confirmada.** El diseñador debe subir el archivo **y además** elegir manualmente un estado en un desplegable y pulsar "Guardar". Si no lo hace, el logo queda en "En revisión". Peor: la pestaña "Aprobación" del asesor solo muestra estados "aprobado", así que los que quedan en "Listo para aprobación" (hoy 5) no se ven ahí. No existe historial de estados en solicitudes de logo.
- **Precios (punto 2): parcialmente verificado.** 470 pedidos tienen `total ≠ unitario × cantidad`. Parte es esperado (costos adicionales de escarcha/logo/molde se suman solo a la primera línea), pero al reabrir/editar el pedido el precio unitario se **reconstruye dividiendo el total entre la cantidad**, lo que produce valores como $9.800 en vez de $10.000. Se hará auditoría antes de tocar fórmulas.
- **Cantidades Producción vs Despachos (punto 5): sin confirmar aún.** En base de datos solo hay 2 órdenes de producción con cantidad distinta a su pedido, así que la causa más probable es la división en líneas (un pedido de 100 partido en 2 líneas de 50) mostrada distinto en cada módulo. Primer paso del trabajo será reproducir un caso real antes de cambiar lógica.

## Qué se va a construir

### 1. Flujo de logos automático + historial
- Al subir el diseño ajustado, el estado pasa **automáticamente** a "Listo para aprobación"; no hace falta tocar el desplegable.
- La pestaña de Aprobación del asesor incluirá también los logos "Listo para aprobación" (hoy invisibles ahí), con avisos por notificación al asesor.
- Nueva tabla de historial de estados de cada solicitud (quién, cuándo, de qué estado a cuál, comentario) visible en la tarjeta del logo.
- Panel de "logos atascados": solicitudes sin movimiento por más de X días, visibles para diseño y admin.

### 2. Blindaje de precios
- El precio unitario ingresado se guarda tal cual y **nunca** se recalcula dividiendo el total; los cargos adicionales dejan de mezclarse con el precio del producto y pasan a ser cargos separados (ver punto 6).
- Cualquier ajuste automático (redondeo, prorrateo) queda visible con su motivo en pantalla.
- Reporte de auditoría de los 470 pedidos descuadrados para revisarlos y corregir los que estén mal.

### 3. Detector de pedidos incompletos hacia Producción
- Chequeo automático por pedido: ¿tiene logo aprobado?, ¿tiene colores de tinta/gel/escarcha?, ¿tiene orden de producción creada?, ¿coincide la cantidad?
- Nuevo panel "Pedidos con problemas de sincronización" en Producción y Admin, con botón de resincronizar (crea/repara la orden de producción faltante) sin depender de José.
- Alerta al asesor cuando su pedido está incompleto.

### 4. Corrección de abonos
- Migración: por cada pedido con abono y sin pagos registrados, se crea el registro de pago inicial correspondiente para que ningún abono histórico se pierda (710 casos).
- Se ajusta la lógica para que registrar un abono nuevo **sume**, nunca reemplace.
- El abono y el saldo se muestran a nivel de pedido completo (no fracción por línea) en las vistas del asesor y contabilidad.
- Historial de cambios de valores monetarios (total, abono, saldo) con autor y fecha.

### 5. Cantidad única entre Producción, Inventario y Despachos
- Reproducir un caso real con cantidades distintas y documentar la causa.
- Unificar el origen de la cantidad: pedido → orden de producción → despacho leen el mismo dato, con entregas parciales descontadas de forma consistente.
- Corrección de los registros históricos descuadrados y chequeo permanente que avisa si vuelve a pasar.

### 6. Edición de pedidos por el asesor
- Mientras el pedido no esté finalizado (no despachado/entregado/facturado), el asesor podrá: modificar cantidades, acabados y colores; agregar o eliminar cargos adicionales (marcación extra, escarcha, tipo de acabado, productos adicionales); recalcular total y saldo automáticamente.
- Cada cambio queda en historial (quién, cuándo, qué cambió, valor anterior y nuevo) y se refleja de inmediato en Producción, Inventario y Despachos.
- Cambios sobre pedidos ya en producción avanzada requieren confirmación explícita y notifican al área afectada.

## Detalle técnico

- **Base de datos**: nueva tabla `logo_request_status_log`; nueva tabla `order_change_log` (cambios de cantidades, cargos y montos); nueva tabla `order_charges` (cargos adicionales por pedido, sustituyendo el "costo adicional pegado a la primera línea"); backfill de `order_payments` desde `orders.abono`; ajuste del trigger `recalc_order_payments` para no destruir abonos preexistentes.
- **Frontend**: `TrabajoDisenador.tsx` (auto-estado al subir), `AprobacionAsesor.tsx` (incluir `listo_aprobacion`), nuevo `LogoStatusHistory`; nuevo `OrderEditDialog` ampliado en `MisPedidos.tsx` con cargos; nuevo panel de sincronización en Producción; reutilización de `ChangeLogPanel` para historiales.
- **Orden de ejecución sugerido**: (4) abonos → (1) logos → (6) edición de pedidos + cargos → (2) precios → (3) sincronización producción → (5) cantidades.
