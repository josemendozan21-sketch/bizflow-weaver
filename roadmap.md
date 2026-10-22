# Tareas en curso

## 12. Restaurar inventario afectado por pruebas Bionovations
- [x] Verificar reservas y devoluciones: 28 Lumbar fríos pendientes en MW-XX-01508; el termo de SW-XX-01509 ya devuelto.
- [x] Devolver 28 unidades mediante movimiento trazable e idempotente e47a0b06-51d4-4797-8781-2898348d636c, sin tocar la reserva real de 10 unidades ni otros productos.

## 11. Corrección de umbrales de comisiones por volumen
- [x] Diagnosticar impacto y verificar ID de Valentina: faltan umbrales, coincidencia por nombre actual, redondeo incorrecto del 7,5% en exportación y protección incompleta de liquidaciones aprobadas sin pagar.
- [x] Implementar umbrales autorizados y conservar liquidaciones históricas aprobadas o pagadas; 46 pruebas pasan.
- [x] Verificar en Contabilidad el pedido real SW-VM-01405: Valentina Sweatspot, 1.000 unidades, 10%, base $15.808.000 y comisión estimada $1.580.800; pago parcial sigue sin causar comisión.
- Verificación con otra cuenta de asesor no realizada en este turno; la sesión activa es de administrador.

## 10. Registro y conciliación de pagos históricos de comisiones
- [x] Auditar estructuras y pantallas existentes; plan preparado para aprobación.
- [x] Registro y conciliación implementados con comprobante obligatorio, asignaciones parciales, topes, prevención de duplicados y anulaciones auditables.
- [x] Verificado en Contabilidad y con Ángela: $100 de prueba, $40 aplicados / $60 pendientes, aplicación completa y reverso; asesor sin permisos de escritura. Datos temporales eliminados; 24 pruebas pasan.
- Pendiente de Contabilidad: revisar soportes y asignaciones de los dos pagos históricos reales; permanecen intactos y sin descuento automático.

8. **Conexión Bionovations para Sweat Spot** — COMPLETADO: entradas desplegadas, print_type por línea o pedido, catálogo y siliconas, líneas agrupadas sin escribir order_code. Prueba real de dos líneas, reserva, solicitud Sweatspot y reenvío sin duplicados; los seis avisos de termos entregados a la tienda. La sesión disponible es de asesora y no permite revisar solicitudes del asesor web en Diseño.

1. **Aplicar catálogo del Punto de la 92 desde Excel** — COMPLETADO (76 actualizaciones/renombres, 3 productos nuevos, 124 retirados; cantidades sin tocar).
2. **Filtros por referencia y subreferencia en el Punto de la 92** — COMPLETADO (clasificación automática, filtros en inventario y venta, campos en la ficha y en el Excel).
3. **Unificar flujo de muestras entre Estampación e Inventarios** — COMPLETADO (aprobación real por tamaño y tinta/gel; fabricación en paralelo; entrega de cuerpos bloqueada hasta ambas aprobaciones).
4. **Método de pago en el Punto de la 92** — COMPLETADO (sin efectivo por defecto, confirmación antes de cobrar, aviso si hay comprobante, historial de cambios de ventas).
5. **Comprobante del saldo y regla de despacho** — COMPLETADO (bloque de abonos siempre disponible en pedidos al por mayor con saldo; despacho bloqueado en base de datos si el pedido no está pagado, salvo crédito).
6. **Bodega como única fuente de verdad** — COMPLETADO (clave estable por referencia, origen bodega/tienda en el Punto 92 sin tocar cantidades, asignaciones atómicas Bodega→punto, servicio de reservas para la tienda web, vista de control y realtime).
   - Pendiente del usuario: conteo físico para corregir las cantidades de Bodega.
7. **Comisiones: mostrar las dos cifras del mes** — COMPLETADO (tarjeta "Las dos cifras del mes" en Ventas y Contabilidad con el detalle de lo que llega de otros meses y lo que se factura después; mismo detalle en los exportables de Excel y CSV; el pago no cambia).



## 13. Conciliación caja Punto 92 — investigación sin modificar datos
- [x] Incorporar nuevos hallazgos: Eliana reconoce una salida de $24.100 y Santiago confirma arqueo después de pagos del 21.
- [x] Verificar 48 ventas del 1–13 octubre y correcciones de descuentos con tarjeta; tres pagos del 21 ya registrados por $568.950.
- [x] Preparar Excel con 763 movimientos y diario completo desde junio hasta 21-oct; saldo final verificado $16.099,39, sin cambios de datos.
- [x] Revisar fuente de la vista: historial Caja Menor solo incluye fondos/gastos, cifra Chicó además ventas/retiros; diario del punto solo días con movimientos de efectivo. No demuestra faltantes físicos.
- Verificación visual bloqueada: sesión inyectada no cargó Caja Menor y no se pudo renovar para el solicitante; requiere sesión activa con acceso a caja. No se cambió ningún permiso.
- Bloqueado: cierres físicos/Excel de Eliana para localizar primer descuadre; Contabilidad debe validar soportes de dos gastos y origen físico/bancario de los tres pagos.
- Diferencia comparable al cierre: $747.350 físicos − $16.099,39 registrados = $731.250,61; $48.200 de gastos adicionales por validar, resto $683.050,61 sin explicar. No corregir sin evidencia y aprobación específica.

## 9. Comisiones claras + confirmación contraentrega (en curso)
- Resumen de una línea por asesor (Contabilidad) y tarjeta grande (asesor); quitar pantallas antiguas.
- Contraentrega: asesor confirma cobrado/no cobrado tras despacho; solo suma si cobrado.
- [x] Panel de comisiones con 8 cifras, tabla de pendientes, filtros y fecha de pago día 20 (mié/vie) — documento de Jose Mario
- [x] Contraentregas anteriores (129, sin estado): se dejan como están, siguen sumando; el ajuste lo hacen los asesores manualmente (decisión Santiago, 21-oct).

## Punto 92 — descuentos y arqueo (22-oct)
- [x] Cálculo de descuento por producto verificado con prueba (una sola vez, al peso)
- [x] Excel de descuentos + cruce diario con arqueo de Eliana
- [ ] Corregir totales de ventas con doble descuento y anular gasto duplicado del 25-sep — espera aprobación
- [ ] Explicar $20.198 previos a agosto — espera cierres de junio–julio
