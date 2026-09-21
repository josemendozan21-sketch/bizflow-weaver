import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeftRight } from "lucide-react";
import type { AdvisorPeriodBridge, PeriodBridgeBucket } from "@/lib/commissions";

const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

function BucketChips({
  buckets,
  tone,
}: {
  buckets: PeriodBridgeBucket[];
  tone: "amber" | "sky";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300"
      : "border-sky-300 bg-sky-50 text-sky-800 dark:bg-sky-950/20 dark:text-sky-300";
  return (
    <div className="flex flex-wrap gap-1.5">
      {buckets.map((b) => (
        <span
          key={b.period}
          className={`rounded-full border px-2 py-0.5 text-[11px] ${toneClass}`}
        >
          {b.label}: {b.count} pedido(s) · {fmt(b.total)}
        </span>
      ))}
    </div>
  );
}

/**
 * Muestra las dos cifras del mes lado a lado y explica de dónde viene la
 * diferencia: ventas de meses anteriores que se facturaron ahora y ventas
 * de este mes que se facturarán después. El total a pagar no cambia.
 */
export function PeriodBridgeCard({
  bridge,
  compact = false,
}: {
  bridge: AdvisorPeriodBridge;
  compact?: boolean;
}) {
  const {
    soldInMonth,
    settledInMonth,
    ownSalesSettled,
    carriedIn,
    carriedOut,
    carriedInTotal,
    carriedOutTotal,
  } = bridge;

  const equal = Math.abs(soldInMonth.total - settledInMonth.total) < 1;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4" /> Las dos cifras del mes
        </CardTitle>
        {!compact && (
          <p className="text-xs text-muted-foreground [text-wrap:pretty]">
            Las dos son correctas: una es lo que se vendió en el mes y la otra
            lo que se facturó en el mes. Sobre la segunda se liquida el pago.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Vendido en el mes</p>
            <p className="text-2xl font-bold">{fmt(soldInMonth.total)}</p>
            <p className="text-xs text-muted-foreground">
              {soldInMonth.count} pedido(s) tomado(s) en el mes
            </p>
          </div>
          <div className="rounded-md border border-emerald-300 p-3">
            <p className="text-xs text-muted-foreground">Liquidado en el mes</p>
            <p className="text-2xl font-bold text-emerald-600">
              {fmt(settledInMonth.total)}
            </p>
            <p className="text-xs text-muted-foreground">
              {settledInMonth.count} pedido(s) facturado(s) en el mes · este es
              el que se paga
            </p>
          </div>
        </div>

        {equal ? (
          <p className="text-xs text-muted-foreground">
            Este mes las dos cifras coinciden: todo lo vendido quedó facturado
            a tiempo.
          </p>
        ) : (
          <div className="space-y-2 text-xs">
            {carriedIn.length > 0 && (
              <div className="space-y-1">
                <p className="font-medium">
                  Se sumaron ventas de meses anteriores facturadas ahora:{" "}
                  <b>{fmt(carriedInTotal.total)}</b> ({carriedInTotal.count}{" "}
                  pedido(s))
                </p>
                <BucketChips buckets={carriedIn} tone="amber" />
              </div>
            )}
            {carriedOut.length > 0 && (
              <div className="space-y-1">
                <p className="font-medium">
                  Ventas de este mes que se facturarán más adelante y no entran
                  aquí: <b>{fmt(carriedOutTotal.total)}</b> (
                  {carriedOutTotal.count} pedido(s))
                </p>
                <BucketChips buckets={carriedOut} tone="sky" />
              </div>
            )}
            <p className="text-muted-foreground border-t pt-2 [text-wrap:pretty]">
              De lo liquidado este mes, <b>{fmt(ownSalesSettled.total)}</b> es
              de ventas del propio mes y{" "}
              <b>{fmt(carriedInTotal.total)}</b> viene de meses anteriores. El
              total que se paga no cambia: solo cambia en qué mes se cuenta.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
