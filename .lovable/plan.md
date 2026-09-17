# Unificar el flujo entre Estampación e Inventarios

El pedido debe estar visible para ambas áreas desde que el diseño está aprobado. Estampación prepara y envía las muestras; el asesor aprueba tamaño y tinta/gel; solo entonces Inventarios entrega los cuerpos. Si no hay cuerpos disponibles, Inventarios sí puede solicitar su fabricación mientras se tramitan las aprobaciones.

## Problema confirmado

Hoy existen dos aprobaciones distintas que no están coordinadas:

- Inventarios bloquea o habilita usando el estado general de “muestra”.
- La aprobación real del asesor se guarda aparte, en los pasos de tamaño y tinta/gel.
- Estampación incluso puede marcar manualmente la muestra como aprobada, aunque esa decisión corresponde al asesor.

Los datos actuales muestran la inconsistencia: hay 6 pedidos con tamaño y tinta/gel aprobados que todavía figuran como “pendiente de muestra”, y 10 con “muestra aprobada” aunque no tienen aprobados ambos pasos.

## Flujo corregido

1. **Visible en ambas áreas desde el inicio**
   - Cuando el diseño ya está aprobado, el pedido aparece simultáneamente en Inventarios y en Estampación, para Magical y Sweatspot.
   - Estampación puede recibirlo para preparar la muestra sin que desaparezca de Inventarios.
   - En Inventarios seguirá visible con el estado del proceso y las acciones que correspondan.

2. **Aprobación única y real**
   - Estampación sube primero la muestra de tamaño y luego la de tinta/gel.
   - El asesor correspondiente aprueba o rechaza cada paso desde su pantalla.
   - Se eliminan de Estampación los botones que permiten marcar por cuenta propia “Muestra aprobada/rechazada”.
   - El estado general de muestra se sincroniza automáticamente con esas dos aprobaciones reales.

3. **Producción en paralelo**
   - Inventarios puede usar “Solicitar Producción” aunque las muestras sigan pendientes.
   - La fabricación de cuerpos puede avanzar mientras el asesor revisa tamaño y tinta/gel.
   - Solicitar producción no se interpreta como entrega de cuerpos.

4. **Entrega de cuerpos solo después de ambas aprobaciones**
   - “Enviar a Estampación” en Magical y “Salir kit” / entrega equivalente en Sweatspot quedan bloqueados hasta que tamaño y tinta/gel estén aprobados por el asesor.
   - La tarjeta muestra exactamente qué falta: tamaño, tinta/gel o ambos.
   - Al aprobar ambos pasos, Inventarios recibe el aviso y el botón de entrega se habilita automáticamente.
   - La entrega final a Logística conserva el mismo requisito.

5. **Corregir pedidos actuales sin perder historial**
   - Sincronizar el estado general de los pedidos existentes usando las aprobaciones reales de tamaño y tinta/gel.
   - No cambiar fotos, comentarios, cantidades, inventario, etapas ya completadas ni fechas de aprobación.

## Detalles técnicos

- Usar `stamp_size_status` y `stamp_inkgel_status` de la orden de producción como fuente de verdad.
- Sincronizar `orders.sample_status` mediante una función/trigger cuando cambie cualquiera de los dos pasos; `muestra_aprobada` solo cuando ambos sean `aprobado` o `finalizado`.
- Mantener la notificación existente a Inventarios al pasar realmente a `muestra_aprobada`.
- En la bandeja de Inventarios, consultar las dos aprobaciones y separar “pedido visible” de “cuerpos entregables”; una orden de producción activa no debe convertir la tarjeta en solo lectura.
- En Estampación, conservar “Por ingresar” para preparar muestras antes de recibir cuerpos, pero quitar la aprobación manual del estado general.
- Aplicar las mismas reglas a Magical y Sweatspot, respetando sus acciones y referencias propias.
- Validar con casos de ambos flujos: con stock, con stock insuficiente y producción solicitada en paralelo.
