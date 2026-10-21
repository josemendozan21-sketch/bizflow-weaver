# Tareas en curso

## 10. Registro y conciliación de pagos históricos de comisiones
- [ ] Auditar estructuras y pantallas existentes y presentar el plan de mínimos cambios.
- En espera de aprobación: implementación y cualquier cambio de saldos históricos; no aplicar migraciones antes.

8. **Conexión Bionovations para Sweat Spot** — COMPLETADO: entradas desplegadas, print_type por línea o pedido, catálogo y siliconas, líneas agrupadas sin escribir order_code. Prueba real de dos líneas, reserva, solicitud Sweatspot y reenvío sin duplicados; los seis avisos de termos entregados a la tienda. La sesión disponible es de asesora y no permite revisar solicitudes del asesor web en Diseño.

1. **Aplicar catálogo del Punto de la 92 desde Excel** — COMPLETADO (76 actualizaciones/renombres, 3 productos nuevos, 124 retirados; cantidades sin tocar).
2. **Filtros por referencia y subreferencia en el Punto de la 92** — COMPLETADO (clasificación automática, filtros en inventario y venta, campos en la ficha y en el Excel).
3. **Unificar flujo de muestras entre Estampación e Inventarios** — COMPLETADO (aprobación real por tamaño y tinta/gel; fabricación en paralelo; entrega de cuerpos bloqueada hasta ambas aprobaciones).
4. **Método de pago en el Punto de la 92** — COMPLETADO (sin efectivo por defecto, confirmación antes de cobrar, aviso si hay comprobante, historial de cambios de ventas).
5. **Comprobante del saldo y regla de despacho** — COMPLETADO (bloque de abonos siempre disponible en pedidos al por mayor con saldo; despacho bloqueado en base de datos si el pedido no está pagado, salvo crédito).
6. **Bodega como única fuente de verdad** — COMPLETADO (clave estable por referencia, origen bodega/tienda en el Punto 92 sin tocar cantidades, asignaciones atómicas Bodega→punto, servicio de reservas para la tienda web, vista de control y realtime).
   - Pendiente del usuario: conteo físico para corregir las cantidades de Bodega.
7. **Comisiones: mostrar las dos cifras del mes** — COMPLETADO (tarjeta "Las dos cifras del mes" en Ventas y Contabilidad con el detalle de lo que llega de otros meses y lo que se factura después; mismo detalle en los exportables de Excel y CSV; el pago no cambia).



## En espera: conciliación caja Punto 92 (21 oct)
- Diagnóstico guardado en .lovable/plan.md (no se modificó nada).
- Bloqueado: Excel original de Eliana con cierres diarios + confirmar si los tres $24.100 son una sola salida.
- Sin explicar: $114.100. Faltan registrar pagos del 21 oct ($568.950).

## 9. Comisiones claras + confirmación contraentrega (en curso)
- Resumen de una línea por asesor (Contabilidad) y tarjeta grande (asesor); quitar pantallas antiguas.
- Contraentrega: asesor confirma cobrado/no cobrado tras despacho; solo suma si cobrado.
- [x] Panel de comisiones con 8 cifras, tabla de pendientes, filtros y fecha de pago día 20 (mié/vie) — documento de Jose Mario
- [x] Contraentregas anteriores (129, sin estado): se dejan como están, siguen sumando; el ajuste lo hacen los asesores manualmente (decisión Santiago, 21-oct).
