# Comisiones: PDF sin agosto + alinear las tres vistas

## Qué encontré (verificado en código y base de datos)

1. **El PDF/panel de ajuste NO usa la misma fórmula que las vistas.**
   `CommissionAdjustmentPanel.tsx` tiene su propia función `rateFor()` con tarifas fijas
   (6% recompra, 10% mayorista nuevo, 12%/10% detal). La lógica oficial
   (`src/lib/commissions.ts` → `getCommissionRate`) además aplica **tarifas de fin de semana**
   (7% recompra FDS, 12% mayorista FDS, 20%/17% detal FDS) cuando el asesor supera
   los $15.000.000 causados en el mes, y suma **bonos** ($150.000 sobre $10M y $100.000 sobre $18M).
   El panel ignora ambos.

   Esto no es teórico: en junio Pilar causó $68,7M y en julio Ángela $46,9M (ambos sobre el umbral),
   y hay pedidos de fin de semana en esos meses (junio: 2 pedidos / $92.000; julio: 19 pedidos / $9,0M).
   Por eso las cifras del PDF no cuadran con lo que ven asesor y contabilidad.

2. **Asesor y contabilidad sí usan el mismo motor** (`summarizeAdvisorProgress` vs
   `summarizeAdvisorMonth` en `commissions.ts`, ambas con `getDefaultPaymentMode`), pero muestran
   conteos distintos: contabilidad cuenta solo los pedidos que **causan** comisión y el asesor
   muestra **todos** los del mes. Visualmente parecen datos contradictorios aunque el cálculo coincide.

3. No hay diferencia por datos: `order_charges` está vacía (0 filas) y hay 1.163 pedidos en total,
   por debajo del tope de carga, así que ambas vistas leen el mismo universo de pedidos.

## Qué se va a hacer

### 1. PDF v2 sin agosto
- Quitar del PDF todas las filas y totales de **2026-08**: resumen, tabla por asesor/mes y detalle por pedido.
- El documento queda como "ajuste retroactivo junio + julio 2026" únicamente, con una nota corta
  indicando que agosto se liquida por el proceso normal (ya con los abonos corregidos).
- Se entrega como archivo nuevo (`ajuste_comisiones_contabilidad_v2.pdf`), sin sobreescribir el actual.
- QA visual página por página antes de entregar.

### 2. El panel de ajuste usa la fórmula oficial
- Reemplazar `rateFor()` por el cálculo real de `commissions.ts`: agrupar por asesor y mes,
  calcular el causado del mes, decidir el desbloqueo de fin de semana y aplicar
  `getCommissionRate` con FDS, tipo de venta, recompra y forma de pago.
- Incluir el **delta de bonos** cuando el causado corregido cruza los umbrales de $10M/$18M.
- Mantener el corte: solo periodos hasta `2026-07` generan ajuste retroactivo; agosto en adelante
  se marca "Aún no liquidado" y no suma al total a pagar.
- Recalcular el Excel y el PDF con estos mismos números para que documento y pantalla coincidan.

### 3. Que asesor y contabilidad se lean igual
- En ambas tablas mostrar la misma tríada de cifras: **pedidos del mes / pedidos que causan /
  pedidos pendientes o excluidos**, con el mismo criterio de periodo (mes de factura).
- Añadir en la vista de contabilidad la misma leyenda de reglas que ya ve el asesor
  (`CommissionRulesLegend`) y el desglose por motivo de exclusión.
- Añadir un indicador visible de "Comisión del mes" idéntico en las dos vistas (causada + bono),
  para que la comparación sea directa.

## Detalles técnicos

- Archivos a modificar: `src/components/contabilidad/CommissionAdjustmentPanel.tsx`
  (usar `summarizeAdvisorMonth`/`buildLine` en vez de `rateFor`),
  `src/components/contabilidad/CommissionsPanel.tsx` y `src/components/ventas/MisComisiones.tsx`
  (columnas y leyenda comunes). `src/lib/commissions.ts` queda como única fuente de verdad; si hace
  falta, se le añade un helper exportado para el cálculo retroactivo por lote.
- Los scripts de generación de Excel/PDF se ajustan para replicar exactamente
  `getCommissionRate` + bonos, y se recalculan los totales del ajuste retroactivo.
- No se modifica el esquema de base de datos.

## Sobre la certeza

El arreglo de registro de abonos (trigger `recalc_order_payments` + flujos de confirmación) ya está
aplicado y verificado. Lo que **no** estaba 100% correcto son las tarifas usadas en el reporte de
ajuste: por eso los números del PDF y de las pantallas no coincidían. Tras este cambio, las tres
vistas y el documento saldrán del mismo cálculo, y el total retroactivo de junio + julio cambiará
respecto al PDF actual (subirá por las tarifas de fin de semana y los bonos).
