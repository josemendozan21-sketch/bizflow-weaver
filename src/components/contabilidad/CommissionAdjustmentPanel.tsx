import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Download, Loader2, Wallet } from "lucide-react";
import OrderCodeBadge from "@/components/common/OrderCodeBadge";
import { computeRetroAdjustment, type RetroAdjustmentRow } from "@/lib/commissions";
import type { Order } from "@/hooks/useOrders";

/** Marca dejada por la corrección automática de abonos finales. */
export const FIX_NOTE = "Saldo final confirmado por el asesor (corrección automática 2026-09-03)";

function fmt(n: number) {
  return `$${Math.round(n || 0).toLocaleString("es-CO")}`;
}

type AdjRow = RetroAdjustmentRow;

/** Último mes ya liquidado a los asesores: solo esos generan ajuste retroactivo. */
const LAST_SETTLED_PERIOD = "2026-07";

export default function CommissionAdjustmentPanel({ advisorFilter }: { advisorFilter?: string }) {
  const [open, setOpen] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["commission-adjustment", FIX_NOTE, "v2"],
    queryFn: async () => {
      const [{ data: pays, error }, { data: ords, error: ordErr }, { data: charges }] =
        await Promise.all([
          supabase.from("order_payments").select("order_id, amount").eq("notes", FIX_NOTE),
          supabase.from("orders").select("*").range(0, 19999),
          supabase.from("order_charges").select("order_id, amount").range(0, 19999),
        ]);
      if (error) throw error;
      if (ordErr) throw ordErr;

      const fixed: Record<string, number> = {};
      for (const p of pays || []) {
        fixed[p.order_id] = (fixed[p.order_id] || 0) + Number(p.amount || 0);
      }
      const chargeMap: Record<string, number> = {};
      for (const c of (charges as any[]) || []) {
        chargeMap[c.order_id] = (chargeMap[c.order_id] || 0) + Number(c.amount || 0);
      }

      return computeRetroAdjustment(
        (ords || []) as unknown as Order[],
        fixed,
        chargeMap,
        LAST_SETTLED_PERIOD
      );
    },
  });

  const groups = useMemo(
    () =>
      (data || []).filter((g) =>
        advisorFilter ? g.advisor.toLowerCase() === advisorFilter.toLowerCase() : true
      ),
    [data, advisorFilter]
  );

  const rows = useMemo(() => groups.flatMap((g) => g.rows), [groups]);


  /** Solo los meses ya liquidados generan un pago retroactivo. */
  const totalAjuste = groups.filter((g) => g.settled).reduce((s, g) => s + g.ajuste, 0);
  const totalNoLiquidado = groups.filter((g) => !g.settled).reduce((s, g) => s + g.ajuste, 0);


  async function exportXlsx() {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        groups.map((g) => ({
          Asesor: g.advisor,
          Mes: g.period,
          Estado: g.settled ? "Ya liquidado — ajuste a pagar" : "Aún no liquidado",
          Pedidos: g.rows.length,
          Facturado: Math.round(g.facturado),
          "Comisión pagada antes": Math.round(g.antes),
          "Comisión correcta": Math.round(g.correcta),
          "Bono adicional": Math.round(g.bonoDelta),
          "Ajuste a pagar": Math.round(g.ajuste),
        }))
      ),
      "Resumen"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        rows.map((r) => ({
          Asesor: r.advisor,
          Mes: r.period,
          Pedido: r.code,
          Cliente: r.client,
          Total: Math.round(r.total),
          "Base comisionable": Math.round(r.net),
          Tarifa: `${(r.rate * 100).toFixed(0)}%`,
          "Fin de semana": r.weekend ? "Sí" : "No",
          "Abono registrado antes": Math.round(r.abonoAntes),
          "Comisión antes": Math.round(r.comisionAntes),
          "Comisión correcta": Math.round(r.comisionCorrecta),
          Ajuste: Math.round(r.ajuste),
          Facturado: r.invoiced ? "Sí" : "Pendiente",
        }))
      ),
      "Detalle"
    );
    XLSX.writeFile(wb, `ajuste_comisiones_abonos.xlsx`);
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!groups.length) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          No hay pedidos con ajuste de comisión pendiente por la corrección de abonos.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Ajuste retroactivo de comisiones
          </CardTitle>
          <CardDescription>
            Pedidos ya entregados cuyo saldo final no quedaba registrado: la comisión se liquidó
            sobre el abono inicial. Solo los meses <b>ya liquidados</b> (hasta {LAST_SETTLED_PERIOD})
            generan un pago retroactivo; los meses posteriores ya quedan corregidos y se pagan en su
            liquidación normal.
          </CardDescription>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground">Ajuste retroactivo (meses ya pagados)</p>
          <p className="text-xl font-semibold text-emerald-600">{fmt(totalAjuste)}</p>
          {totalNoLiquidado > 0 && (
            <p className="text-[11px] text-muted-foreground mt-1">
              + {fmt(totalNoLiquidado)} en meses aún no liquidados (no se paga aparte)
            </p>
          )}
          <Button size="sm" variant="outline" className="mt-2" onClick={exportXlsx}>
            <Download className="h-4 w-4 mr-1" />
            Excel
          </Button>
        </div>

      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Asesor</TableHead>
              <TableHead>Mes</TableHead>
              <TableHead className="text-right">Pedidos</TableHead>
              <TableHead className="text-right">Facturado</TableHead>
              <TableHead className="text-right">Comisión liquidada</TableHead>
              <TableHead className="text-right">Comisión correcta</TableHead>
              <TableHead className="text-right">Ajuste</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((g) => (
              <>
                <TableRow
                  key={g.key}
                  className="cursor-pointer"
                  onClick={() => setOpen(open === g.key ? null : g.key)}
                >
                  <TableCell>
                    {open === g.key ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{g.advisor}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {g.period}
                      {!g.settled && (
                        <Badge variant="outline" className="text-[10px]">
                          Aún no liquidado
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{g.rows.length}</TableCell>
                  <TableCell className="text-right">{fmt(g.facturado)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{fmt(g.antes)}</TableCell>
                  <TableCell className="text-right">{fmt(g.correcta)}</TableCell>
                  <TableCell
                    className={`text-right font-semibold ${
                      g.settled ? "text-emerald-600" : "text-muted-foreground"
                    }`}
                  >
                    {fmt(g.ajuste)}
                    {g.bonoDelta > 0 && (
                      <span className="block text-[10px] font-normal text-muted-foreground">
                        incl. bono {fmt(g.bonoDelta)}
                      </span>
                    )}
                    {g.weekendUnlocked && (
                      <span className="block text-[10px] font-normal text-muted-foreground">
                        tarifas FDS desbloqueadas
                      </span>
                    )}
                  </TableCell>

                </TableRow>
                {open === g.key && (
                  <TableRow key={`${g.key}-d`}>
                    <TableCell colSpan={8} className="bg-muted/40">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Pedido</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Base</TableHead>
                            <TableHead className="text-right">Tarifa</TableHead>
                            <TableHead className="text-right">FDS</TableHead>
                            <TableHead className="text-right">Antes</TableHead>
                            <TableHead className="text-right">Correcta</TableHead>
                            <TableHead className="text-right">Ajuste</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {g.rows.map((r) => (
                            <TableRow key={r.orderId}>
                              <TableCell className="whitespace-nowrap">
                                <OrderCodeBadge code={r.code} />
                                {!r.invoiced && (
                                  <Badge variant="outline" className="ml-2">
                                    Sin factura
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="max-w-[220px] truncate">{r.client}</TableCell>
                              <TableCell className="text-right">{fmt(r.total)}</TableCell>
                              <TableCell className="text-right">{fmt(r.net)}</TableCell>
                              <TableCell className="text-right">
                                {(r.rate * 100).toFixed(0)}%
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {r.weekend ? "Sí" : "—"}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {fmt(r.comisionAntes)}
                              </TableCell>
                              <TableCell className="text-right">{fmt(r.comisionCorrecta)}</TableCell>
                              <TableCell className="text-right font-medium text-emerald-600">
                                {fmt(r.ajuste)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
