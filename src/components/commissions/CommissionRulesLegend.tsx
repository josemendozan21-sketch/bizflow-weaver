import { Info } from "lucide-react";

/**
 * Leyenda de reglas de liquidación de comisiones.
 * Se muestra en la tarjeta "Avance de metas" del asesor y en el
 * panel de comisiones de Contabilidad para que ambas vistas
 * expliquen lo mismo y sin cortes de texto.
 */
export function CommissionRulesLegend() {
  const rules: Array<{ label: string; text: React.ReactNode }> = [
    {
      label: "Período",
      text: (
        <>
          El de la <b>factura</b>; si el pedido aún no tiene factura, se muestra
          en su mes de venta y queda pendiente de facturar.
        </>
      ),
    },
    {
      label: "Causa comisión",
      text: (
        <>
          Pedido <b>pagado o facturado</b>; con abono parcial, se causa
          proporcional a lo abonado.
        </>
      ),
    },
    {
      label: "Base comisionable",
      text: (
        <>
          <b>Excluye flete y cargos adicionales</b> y se calcula sin IVA.
        </>
      ),
    },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-3 text-xs text-muted-foreground">
      {rules.map((r) => (
        <div key={r.label} className="flex items-start gap-1.5 min-w-0">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <p className="min-w-0 [text-wrap:pretty]">
            <b className="text-foreground">{r.label}:</b> {r.text}
          </p>
        </div>
      ))}
    </div>
  );
}
