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

---

# Ventas contraentrega: el asesor confirma la entrega y el cobro antes de que cuenten

## Problema
Hoy hay 129 pedidos marcados como "Contra entrega". Hoy cuentan para la comisión como cualquier otro pedido, aunque nadie haya confirmado que el cliente recibió y pagó.

## Cómo va a funcionar
1. **Logística despacha** el pedido contraentrega, como hoy.
2. Le llega al asesor un **aviso**: "Confirma la entrega de [cliente] — pedido [código], valor a cobrar $X". Además, en sus Comisiones aparece un bloque **"Contraentregas por confirmar"**.
3. El asesor responde con uno de dos botones:
   - **"Recibido y pagado"**: escribe una nota y adjunta un comprobante si lo hay (guía entregada, foto, consignación de la transportadora). El pedido **suma** a la comisión del mes en que se confirma.
   - **"No se entregó / no pagó"**: elige el motivo (devolución, rechazó el pedido, no lo encontraron, otro) y escribe una nota. El pedido **no suma** y queda marcado "No suma: contraentrega no cobrada — [motivo]".
4. **Mientras no confirme**, el pedido aparece en "Te faltan para cobrar" con la razón **"Falta confirmar entrega contraentrega"**, y no suma.
5. **Contabilidad** ve en el detalle de cada asesor la misma marca, y puede confirmar o revertir con una nota si el asesor se equivoca. Todo queda en el historial del pedido: quién, cuándo y qué respondió.
6. Si pasan 7 días desde el despacho sin respuesta, se le repite el aviso al asesor y se le avisa a Contabilidad.

## Pedidos contraentrega anteriores
Esta regla aplica **de ahora en adelante**. Los pedidos contraentrega ya incluidos en liquidaciones pagadas no se tocan. Para los que todavía no se han liquidado, propongo pedir la confirmación también, para no pagar algo no cobrado. Lo confirmo contigo antes de aplicarlo.

## Detalles técnicos
- Columnas nuevas en `orders`: `cod_confirmation` ('pendiente' | 'cobrado' | 'no_cobrado'), `cod_confirmed_at`, `cod_confirmed_by`, `cod_reason`, `cod_proof_url`.
- Un trigger, al pasar el pedido a despachado con `payment_method = 'contra_entrega'`, pone el estado en 'pendiente' y crea la notificación al asesor.
- Una función con permisos acotados `confirm_cod_delivery(_order_id, _received, _reason, _proof)`: solo puede usarla el asesor dueño del pedido, admin o contabilidad. Escribe en `order_change_log`.
- `commissionSettlement.ts`: un pedido contraentrega solo es 100% si `cod_confirmation = 'cobrado'`. La fecha de causación es `cod_confirmed_at`. Si es 'no_cobrado', se excluye con su motivo visible. Se agregan pruebas para los tres estados.
- Recordatorio a los 7 días mediante la revisión programada que ya existe.
