# Comisiones claras: una sola cifra por asesor, igual para Contabilidad y para el asesor

## Problema actual
- Hay **dos pantallas por lado** con cálculos distintos. En Ventas están "Mis liquidaciones" y, debajo, el cuadro anterior de comisiones. En Contabilidad están el panel anterior de comisiones y "Contabilidad y Asesores". Por eso las cifras no siempre coinciden.
- Las tablas muestran todo a la vez: base sin IVA, porcentaje, mes de comisión, fecha de pago completo, pendientes anteriores, etc. Eso hace difícil ver lo esencial: **cuánto vendió y cuánto se le paga**.

## Qué cambia

### 1. Una sola fuente de verdad
Se quitan las pantallas anteriores (el cuadro viejo en Ventas y el panel viejo en Contabilidad). Las dos vistas usan el mismo cálculo, con las reglas de hoy: solo pedidos al 100%, causación en el mes del pago completo, pago al mes siguiente y bonos de Magical y Sweat Spot. Lo que ve Contabilidad para Ángela es exactamente lo que ve Ángela.

### 2. Contabilidad: un resumen de una línea por asesor
Se elige el mes de pago, por ejemplo "Pago de noviembre (ventas completadas en octubre)".

```text
Asesor          Ventas al 100%   Pedidos   Comisión     Bono       A pagar      Estado
Ángela María    $25.300.000      39        $1.521.228   $250.000   $1.771.228   Por pagar
Pilar           ...
                                                         TOTAL A PAGAR $X
```
- Botón "Marcar pagado" por asesor y un Excel del mes con la misma tabla.
- Al tocar un asesor se abre su detalle (punto 4).

### 3. Asesor: una tarjeta grande
```text
Tu pago de noviembre
$1.771.228
Comisión $1.521.228 + Bono $250.000
39 pedidos completados en octubre · Ventas $25.300.000
Estado: Por pagar
```
Debajo hay dos bloques cortos:
- **"Te faltan para cobrar"**: pedidos aún no al 100%, con una sola razón cada uno ("Falta saldo $300.000" o "Falta comprobante"), y lo que sumarían si se completan este mes.
- **"Cómo vas para el bono"**: una barra de avance hacia la meta del mes.

### 4. Detalle (igual para los dos), plegado por defecto
Hay una tabla simple por marca (Magical / Sweat Spot) con: Pedido · Cliente · Valor · Comisión. El porcentaje, la base sin IVA y las fechas solo aparecen al abrir "Ver cálculo" de cada pedido.

### 5. Lenguaje y forma
- Montos redondeados al peso, sin decimales.
- Sin columnas de porcentaje en la vista principal.
- Etiquetas en palabras simples: "Ventas al 100%", "A pagar", "Te falta".
- Las reglas, en un "¿Cómo se calcula?" de 4 líneas, en lugar de la leyenda actual.
- Funciona en celular, con el desplazamiento solo dentro de las tablas.

## Lo que no cambia
Las reglas de porcentajes, los bonos, el 100% (pago total + comprobante) y los pagos históricos ya registrados de Ángela y Pilar.

## Detalles técnicos
- Toda la lógica sigue en `src/lib/commissionSettlement.ts`. Se agrega una función pura `summarizeSettlement(draft)` que devuelve `{ ventas, pedidos, comision, bono, aPagar, porMarca, faltantes }`, con pruebas que comparan contra los valores actuales (por ejemplo, Ángela: comisión 1.521.228 + bono 250.000 = 1.771.228).
- `SettlementsView.tsx` se reorganiza en `SettlementSummaryTable` (contabilidad), `AdvisorPayCard` (asesor) y `SettlementDetail` (compartido).
- Se retiran `MisComisiones` de `Ventas.tsx` y `CommissionsPanel` de `Contabilidad.tsx`. Los archivos se conservan sin usar hasta confirmar.
- Se actualiza el Excel de comisiones (`commissionExports.ts`) con las mismas columnas del resumen.
