# Texto cortado en "Avance de metas" → leyenda legible como componente

## Problema (verificado en `src/components/ventas/MisComisiones.tsx:429-436`)

La leyenda bajo la barra de "Avance de metas" es un único párrafo largo con fragmentos en **negrita** que se parten de forma extraña en pantallas anchas ("El período de liquidación es el / mes de factura / ..."), quedando visualmente cortado y desordenado, como se ve en la captura.

## Solución

1. **Componente nuevo `src/components/commissions/CommissionRulesLegend.tsx`**
   - Reemplaza el párrafo corrido por una lista de reglas cortas, una por línea, con ícono `Info` y texto en `text-xs text-muted-foreground`:
     - **Período:** el de la factura; si aún no tiene factura, se muestra en el mes de venta y queda *pendiente de facturar*.
     - **Causa comisión:** pedido pagado o facturado; con abono parcial, proporcional a lo abonado.
     - **Base comisionable:** excluye flete y cargos adicionales y se calcula sin IVA.
   - Cada regla usa `flex` con viñeta/punto y `text-pretty`/anchos fluidos para que nada se parta a mitad de frase; en pantallas anchas las reglas pueden ir en 2-3 columnas (`sm:grid-cols-3`), en móvil apiladas.

2. **Reusar el componente donde aparezca la misma leyenda**
   - `MisComisiones.tsx` (tarjeta "Avance de metas"): reemplazar el `<p>` por `<CommissionRulesLegend />`.
   - `CommissionsPanel.tsx` (Contabilidad): verificar si tiene la misma explicación inline y reemplazarla por el mismo componente para que ambas vistas muestren el texto idéntico y sin cortes.

## Verificación
- Typecheck + captura con Playwright de la tarjeta a 1206px y a móvil (390px) confirmando que el texto no se corta ni se desborda.
