import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Download, Loader2, Wallet } from "lucide-react";
import OrderCodeBadge from "@/components/common/OrderCodeBadge";
import { IVA_DIVISOR, getFlatRateFor } from "@/lib/commissions";

/** Marca dejada por la corrección automática de abonos finales. */
export const FIX_NOTE = "Saldo final confirmado por el asesor (corrección automática 2026-09-03)";

function fmt(n: number) {
  return `$${Math.round(n || 0).toLocaleString("es-CO")}`;
}

interface AdjRow {
  orderId: string;
  code: string;
  advisor: string;
  period: string; // YYYY-MM
  client: string;
  total: number;
  net: number;
  rate: number;
  abonoAntes: number;
  comisionAntes: number;
  comisionCorrecta: number;
  ajuste: number;
  invoiced: boolean;
}

function rateFor(o: any): number {
  const flat = getFlatRateFor(o.advisor_name);
  if (flat != null) return flat;
  if (o.sale_type === "menor") return 0.12;
  return o.is_recompra ? 0.06 : 0.10;
}

export default function CommissionAdjustmentPanel({ advisorFilter }: { advisorFilter?: string }) {
  const [open, setOpen] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["commission-adjustment", FIX_NOTE],
    queryFn: async () => {
      const { data: pays, error } = await supabase
        .from("order_payments")
        .select("order_id, amount")
        .eq("notes", FIX_NOTE);
      if (error) throw error;
      const fixed = new Map<string, number>();
      for (const p of pays || []) {
        fixed.set(p.order_id, (fixed.get(p.order_id) || 0) + Number(p.amount || 0));
      }
      const ids = [...fixed.keys()];
      if (!ids.length) return [] as AdjRow[];

      const chunks: any[] = [];
      for (let i = 0; i < ids.length; i += 200) {
        const slice = ids.slice(i, i + 200);
        const [{ data: ords }, { data: charges }] = await Promise.all([
          supabase
            .from("orders")
            .select(
              "id, order_code, advisor_name, client_name, total_amount, abono, shipping_cost, sale_type, is_recompra, invoice_date, created_at"
            )
            .in("id", slice),
          supabase.from("order_charges").select("order_id, amount").in("order_id", slice),
        ]);
        const chargeMap = new Map<string, number>();
        for (const c of charges || [])
          chargeMap.set(c.order_id, (chargeMap.get(c.order_id) || 0) + Number(c.amount || 0));
        for (const o of ords || []) chunks.push({ o, extra: chargeMap.get(o.id) || 0 });
      }

      const rows: AdjRow[] = chunks.map(({ o, extra }) => {
        const total = Number(o.total_amount) || 0;
        const net = Math.max(total - (Number(o.shipping_cost) || 0) - extra, 0);
        const rate = rateFor(o);
        const abonoAntes = Math.max((Number(o.abono) || 0) - (fixed.get(o.id) || 0), 0);
        const comisionCorrecta = (net / IVA_DIVISOR) * rate;
        const comisionAntes =
          total > 0 ? ((Math.min(abonoAntes, total) * net) / total / IVA_DIVISOR) * rate : 0;
        const d = new Date(o.invoice_date || o.created_at);
        const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return {
          orderId: o.id,
          code: o.order_code || "",
          advisor: o.advisor_name || "Sin asesor",
          client: o.client_name || "",
          period,
          total,
          net,
          rate,
          abonoAntes,
          comisionAntes,
          comisionCorrecta,
          ajuste: Math.max(comisionCorrecta - comisionAntes, 0),
          invoiced: !!o.invoice_date,
        };
      });
      return rows;
    },
  });

  const rows = useMemo(
    () =>
      (data || []).filter((r) =>
        advisorFilter ? r.advisor.toLowerCase() === advisorFilter.toLowerCase() : true
      ),
    [data, advisorFilter]
  );

  const groups = useMemo(() => {
    const m = new Map<string, { advisor: string; period: string; rows: AdjRow[] }>();
    for (const r of rows) {
      const k = `${r.advisor}__${r.period}`;
      if (!m.has(k)) m.set(k, { advisor: r.advisor, period: r.period, rows: [] });
      m.get(k)!.rows.push(r);
    }
    return [...m.entries()]
      .map(([key, g]) => ({
        key,
        ...g,
        facturado: g.rows.reduce((s, r) => s + r.total, 0),
        antes: g.rows.reduce((s, r) => s + r.comisionAntes, 0),
        correcta: g.rows.reduce((s, r) => s + r.comisionCorrecta, 0),
        ajuste: g.rows.reduce((s, r) => s + r.ajuste, 0),
      }))
      .sort((a, b) => a.advisor.localeCompare(b.advisor) || a.period.localeCompare(b.period));
  }, [rows]);

  const totalAjuste = groups.reduce((s, g) => s + g.ajuste, 0);

  async function exportXlsx() {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        groups.map((g) => ({
          Asesor: g.advisor,
          Mes: g.period,
          Pedidos: g.rows.length,
          Facturado: Math.round(g.facturado),
          "Comisión pagada antes": Math.round(g.antes),
          "Comisión correcta": Math.round(g.correcta),
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
            sobre el abono inicial. Aquí está la diferencia por asesor y por mes.
          </CardDescription>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground">Ajuste total</p>
          <p className="text-xl font-semibold text-emerald-600">{fmt(totalAjuste)}</p>
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
                  <TableCell>{g.period}</TableCell>
                  <TableCell className="text-right">{g.rows.length}</TableCell>
                  <TableCell className="text-right">{fmt(g.facturado)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{fmt(g.antes)}</TableCell>
                  <TableCell className="text-right">{fmt(g.correcta)}</TableCell>
                  <TableCell className="text-right font-semibold text-emerald-600">
                    {fmt(g.ajuste)}
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
