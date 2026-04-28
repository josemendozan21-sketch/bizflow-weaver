
# Análisis mensual de ventas, pedidos e ingresos

Crear una nueva vista de análisis con desglose mensual que permita ver el comportamiento del negocio mes a mes y, posteriormente, sirva como base para proyecciones.

## Dónde vivirá

Nueva pestaña **"Análisis mensual"** dentro del módulo de **Contabilidad** (junto a Dashboard, Pendientes, Facturados, Caja menor). Visible solo para roles **admin** y **contabilidad** (mismo criterio que el Dashboard actual).

Razón: ya tienen acceso completo a todos los pedidos vía RLS, todas las métricas financieras viven aquí, y mantenemos el patrón existente.

## Qué mostrará la pestaña

### 1. Selector de periodo
- Selector de **año** (default: año en curso).
- Selector de **mes** (default: mes en curso) — para ver el detalle de un mes específico.
- Toggle **Marca**: Todas / Magical Warmers / Sweatspot.

### 2. KPIs del mes seleccionado (4 tarjetas)
- **Ventas totales** del mes (suma de `total_amount`) + comparativa vs mes anterior (% y flecha).
- **Pedidos creados** en el mes + comparativa.
- **Ingresos cobrados** del mes (suma de `abono`) + saldo pendiente.
- **Unidades producidas / despachadas** del mes (suma de `quantity` en pedidos despachados).

### 3. Gráfico de evolución 12 meses
Gráfico de barras combinado con línea (recharts) mostrando los últimos 12 meses:
- Barras: ventas en pesos por mes.
- Línea: cantidad de pedidos por mes.
- Tooltip con desglose por marca.

### 4. Tabla "Rotación de productos" del mes
Tabla ordenable con todos los productos vendidos en el mes:

| Producto | Marca | Unidades | Pedidos | Ingresos | % del mes |
|---|---|---|---|---|---|

Ordenable por cualquier columna, default por unidades desc. Identifica visualmente el **top 3** con badge "🔥 Top".

### 5. Tabla "Histórico mensual por producto" (12 meses)
Matriz pivotada — filas = producto, columnas = los últimos 12 meses, celdas = unidades vendidas. Heatmap (celdas más oscuras = más volumen). Total al final de cada fila para detectar rotación sostenida.

Esta tabla es la base para futuras proyecciones.

### 6. Sección "Producción del mes"
Mini-tabla con conteo de pedidos por estado del flujo (`production_status`) en el mes:
- En estampación / dosificación / sellado / empaque / listo / despachado / entregado.

Útil para ver dónde se concentra el cuello de botella del mes.

## Detalles técnicos

**Archivos nuevos:**
- `src/components/contabilidad/MonthlyAnalysis.tsx` — componente principal con selectores, KPIs, gráficos y tablas.
- `src/lib/monthlyAnalytics.ts` — funciones puras para agregar pedidos por mes/producto/marca (facilita pruebas y reutilización futura para proyecciones).

**Archivos modificados:**
- `src/pages/Contabilidad.tsx` — añadir `<TabsTrigger value="analisis">` y `<TabsContent>` que renderice `<MonthlyAnalysis orders={allOrders} />`.

**Datos:** todo se calcula desde la tabla `orders` ya disponible en `allOrders`. No requiere migraciones ni nuevas tablas — usamos `created_at` (mes del pedido), `total_amount`, `abono`, `quantity`, `product`, `brand`, `production_status`, `dispatched_at`.

**Librerías ya instaladas:** `recharts` para gráficos, `date-fns` para manejo de fechas (startOfMonth, subMonths, format con locale `es`).

**Performance:** todas las agregaciones envueltas en `useMemo` con dependencias en `[orders, year, month, brandFilter]`. Para 12 meses x ~cientos de pedidos no hay riesgo.

## Lo que NO incluye este plan (pero queda preparado)

- **Proyecciones automáticas** mes a mes — la tabla histórica de 12 meses es exactamente el insumo que necesita un módulo de proyecciones futuro (promedio móvil, tendencia, estacionalidad). Cuando lo pidas, se monta sobre los mismos agregados.
- **Exportación a Excel del análisis** — fácil de añadir luego con la misma utilidad de `exportSiigo.ts`.
