import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PettyCashCount, useResolveCashCount } from "@/hooks/usePosPettyCash";

const fmt = (n: number) => `$${Number(n).toLocaleString("es-CO", { maximumFractionDigits: 2 })}`;

type Props = { counts: PettyCashCount[]; canResolve: boolean };

/** Historial de cierres diarios: arqueo físico vs. saldo de la plataforma y diferencias pendientes. */
export function CierresDiarios({ counts, canResolve }: Props) {
  const resolve = useResolveCashCount("chico");
  const pending = counts.filter((c) => Math.abs(Number(c.difference)) >= 1 && !c.resolved_at);

  const onResolve = async (c: PettyCashCount) => {
    const note = prompt("¿Cuál fue la causa de la diferencia y cómo se resolvió?")?.trim();
    if (!note) return;
    try {
      await resolve.mutateAsync({ id: c.id, note });
      toast.success("Diferencia marcada como resuelta");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    }
  };

  return (
    <div className="rounded-lg border">
      <div className="px-3 py-2 border-b bg-muted/40 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold">Cierres diarios (arqueo vs. plataforma)</span>
        {pending.length > 0 ? (
          <Badge variant="destructive">
            {pending.length} diferencia{pending.length > 1 ? "s" : ""} pendiente{pending.length > 1 ? "s" : ""} ·{" "}
            {fmt(pending.reduce((a, c) => a + Number(c.difference), 0))}
          </Badge>
        ) : (
          <Badge variant="secondary">Sin diferencias pendientes</Badge>
        )}
      </div>
      {counts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Aún no hay cierres registrados. Usa "Cierre del día".</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="text-left p-2">Fecha</th>
                <th className="text-right p-2">Plataforma</th>
                <th className="text-right p-2">Contado</th>
                <th className="text-right p-2">Diferencia</th>
                <th className="text-left p-2">Estado</th>
                <th className="text-left p-2 min-w-[180px]">Observaciones</th>
                {canResolve && <th className="p-2" />}
              </tr>
            </thead>
            <tbody>
              {counts.slice(0, 60).map((c) => {
                const d = Number(c.difference);
                const ok = Math.abs(d) < 1;
                return (
                  <tr key={c.id} className="border-b last:border-0 align-top">
                    <td className="p-2 whitespace-nowrap">{String(c.count_date).slice(0, 10)}<div className="text-muted-foreground">{c.created_by_name ?? ""}</div></td>
                    <td className="p-2 text-right">{fmt(c.expected_amount)}</td>
                    <td className="p-2 text-right">{fmt(c.counted_amount)}</td>
                    <td className={`p-2 text-right font-semibold ${ok ? "" : d < 0 ? "text-destructive" : "text-primary"}`}>
                      {ok ? "—" : `${d > 0 ? "+" : ""}${fmt(d)}`}
                      {!ok && <div className="font-normal text-muted-foreground">{d < 0 ? "falta" : "sobra"}</div>}
                    </td>
                    <td className="p-2">
                      {ok ? <Badge variant="secondary">Cuadrado</Badge> : c.resolved_at ? <Badge variant="outline">Resuelto</Badge> : <Badge variant="destructive">Pendiente</Badge>}
                    </td>
                    <td className="p-2">
                      {c.notes && <div>{c.notes}</div>}
                      {c.resolution_note && <div className="text-muted-foreground">Resolución: {c.resolution_note} ({c.resolved_by_name})</div>}
                    </td>
                    {canResolve && (
                      <td className="p-2">
                        {!ok && !c.resolved_at && (
                          <Button size="sm" variant="outline" onClick={() => onResolve(c)} disabled={resolve.isPending}>Resolver</Button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
