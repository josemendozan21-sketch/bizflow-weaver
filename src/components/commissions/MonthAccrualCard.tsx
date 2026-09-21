import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarRange, Lock } from "lucide-react";
import type { MonthAccrualSummary } from "@/lib/commissionAccrual";

const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

/**
 * Muestra el mes tal como lo entiende el negocio:
 * - lo que se VENDIÓ en el mes (pedidos que entraron en el mes),
 * - lo que se RECAUDÓ en el mes (cada abono en su mes),
 * - y cuánta comisión ya se puede pagar vs. cuánta queda retenida.
 */
export function MonthAccrualCard({
  summary,
  compact = false,
}: {
  summary: MonthAccrualSummary;
  compact?: boolean;
}) {
  const s = summary;
  return (
    <Card>
      <CardHeader className={compact ? "pb-2" : undefined}>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarRange className="h-4 w-4 text-muted-foreground" />
          Ventas y comisión de {s.periodLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">
              Vendido en el mes ({s.sold.count} pedido{s.sold.count === 1 ? "" : "s"})
            </p>
            <p className="text-xl font-semibold">{fmt(s.sold.total)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ya cobrado {fmt(s.soldCollectedToDate)} · Por cobrar {fmt(s.soldPending)}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Recaudado en el mes</p>
            <p className="text-xl font-semibold">{fmt(s.collectedInMonth)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              De ventas de este mes {fmt(s.collectedFromThisMonth)}
            </p>
          </div>
        </div>

        {s.collectedFromOtherMonths.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              Abonos recibidos este mes que corresponden a ventas anteriores:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {s.collectedFromOtherMonths.map((b) => (
                <span
                  key={b.period}
                  className="rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-[11px] text-sky-800 dark:bg-sky-950/20 dark:text-sky-300"
                >
                  {b.label}: {b.count} pedido(s) · {fmt(b.total)}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Comisión causada</p>
            <p className="text-lg font-semibold">{fmt(s.commissionAccrued)}</p>
          </div>
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 dark:bg-emerald-950/20">
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              Lista para pago
            </p>
            <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-200">
              {fmt(s.commissionPayable)}
            </p>
            {s.bonus > 0 && (
              <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
                + bono {fmt(s.bonus)} = {fmt(s.toPay)}
              </p>
            )}
          </div>
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:bg-amber-950/20">
            <p className="flex items-center gap-1 text-xs text-amber-800 dark:text-amber-300">
              <Lock className="h-3 w-3" /> Retenida
            </p>
            <p className="text-lg font-semibold text-amber-900 dark:text-amber-200">
              {fmt(s.commissionHeld)}
            </p>
            <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
              {s.heldCount} pedido{s.heldCount === 1 ? "" : "s"} sin completar
            </p>
          </div>
        </div>

        {s.heldReasons.length > 0 && (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {s.heldReasons.map((r) => (
              <li key={r.reason}>
                • {r.reason}: {r.count} pedido(s) · {fmt(r.amount)}
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-muted-foreground">
          Cada venta cuenta en el mes en que entró el pedido y cada abono en el mes
          en que se recibió. La comisión se paga cuando el pedido queda 100% pagado,
          con soporte de pago y despachado.
        </p>
      </CardContent>
    </Card>
  );
}
