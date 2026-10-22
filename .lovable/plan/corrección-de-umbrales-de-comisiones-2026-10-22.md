# Corrección de umbrales de comisiones

## Diagnóstico de impacto
- Hoy el cálculo no considera la cantidad de unidades. Valentina recibe un 10% por coincidencia del nombre o correo, sin limitar la excepción a Sweatspot.
- Cuenta de Valentina confirmada: **valemendoza2228@gmail.com**, identificada por su ID verificado, no por el texto del nombre.
- Hay **12 registros de pedidos con 1.000 unidades o más**: 8 Magical y 4 Sweatspot; uno de Sweatspot corresponde a Valentina. No están incluidos en liquidaciones con fecha de aprobación. Este conteo indica pedidos que requieren evaluar tarifa, no que todos generen comisión: se mantienen los requisitos de pago, soporte y exclusiones.
- Las liquidaciones guardan importes y tasas, pero actualmente una liquidación aprobada sin pagar puede volver a aprobarse y reemplazar su cálculo. Es necesario cerrar esa posibilidad antes de aplicar los nuevos porcentajes.
- El Excel/CSV redondea porcentajes a enteros: mostraría 8% en lugar de 7,5%. También hay detalles históricos que muestran una tasa recalculada junto a un importe guardado.

## Cambios propuestos
1. Aplicar la prioridad del documento en todas las vistas y reportes:

| Política | Cantidad | Tarifa |
|---|---:|---:|
| General, ambas marcas | 1–999 | Habitual, sin cambios |
| General, ambas marcas | Desde 1.000 | 5%, reemplaza la habitual |
| Valentina, solo Sweatspot | 1–1.000 | 10% |
| Valentina, solo Sweatspot | Desde 1.001 | 7,5% |

2. Identificar a Valentina por su ID; sus pedidos de otras marcas siguen la política general.
3. Conservar base antes de IVA, después de descuentos comerciales, excluyendo flete y cargos según las reglas existentes. Verificar que el total registrado ya contemple los descuentos para no restarlos dos veces.
4. Proteger liquidaciones históricas aprobadas o pagadas: no recalcular ni reemplazar sus partidas; mostrar su base, tasa e importe originales. Mantener los pagos parciales, conciliaciones y anulaciones auditables existentes.
5. Mostrar el 7,5% correctamente en el detalle y los exportables; actualizar la explicación de las tarifas sin añadir más cifras al resumen.

## Alcance y condiciones que se conservan
- Pago al 100% y comprobante; no se añade un requisito de despacho a pedidos normales.
- Contraentregas nuevas: confirmación de recepción y cobro por el asesor; las anteriores continúan como se acordó.
- Bonos, causación, calendario, aprobación contable, pagos históricos, permisos y prevención de doble comisión sin cambios.
- Aplicar los umbrales al cálculo de pedidos aún no aprobados/liquidados, incluidos los consultados de meses anteriores; no se establece una nueva fecha de corte.
- Mantener la unidad de cálculo actual: cantidad de cada registro de pedido, sin sumar líneas independientes ni ventas mensuales para alcanzar el umbral.
- No modificar caja del Punto 92; esa conciliación sigue en espera.

## Detalles técnicos
- Centralizar la selección de tarifa por pedido y compartirla entre `commissions.ts`, `commissionSettlement.ts` y `commissionAccrual.ts`; conservar sus criterios actuales de mes y bonos.
- ID de la excepción Sweatspot: `b6d9d742-dc01-4350-9cd1-54b663b2f805`.
- Ajustar la presentación de partidas históricas y la precisión de `commissionExports.ts`.
- Bloquear la sustitución de partidas aprobadas tanto en la acción de aprobación como en la base de datos, sin impedir el registro o conciliación de pagos ni las devoluciones a revisión auditables.
- Documentar la regla compartida en `AGENTS.md`.

## Verificación
- Pruebas de límites general: 999, 1.000 y 1.001, en ambas marcas.
- Pruebas Valentina Sweatspot: 999, 1.000, 1.001 y 2.000.
- Verificar prioridad frente a recompra, contado/contraentrega y fin de semana; mismo nombre con otro ID no recibe la excepción, y un cambio de nombre no la elimina.
- Verificar base con descuentos, IVA y exclusiones; consistencia de tarifas entre las rutas de cálculo.
- Comprobar que partidas aprobadas sin pagar, parcialmente pagadas y pagadas mantienen valores originales y rechazan sustituciones.
- Ejecutar las pruebas existentes de liquidación y conciliación y verificar las vistas de asesor y Contabilidad y sus exportaciones.

**Estado:** diagnóstico completo; no se han cambiado cálculos, datos ni liquidaciones. Implementación pendiente de tu autorización.