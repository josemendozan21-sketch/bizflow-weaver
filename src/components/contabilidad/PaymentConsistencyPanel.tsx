import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isOrderFullyPaid, getOrderBalance, type Order } from "@/hooks/useOrders";
import { useOrderPaymentsByOrderIds } from "@/hooks/useOrderPayments";
import { IVA_DIVISOR } from "@/lib/commissions";
import OrderCodeBadge from "@/components/common/OrderCodeBadge";

type IssueKind =
  | "despachado_sin_pago"
  | "pagado_sin_registro"
  | "soporte_final_sin_pago"
  | "soporte_sin_abono"
  | "abono_sin_historial"
  | "descuadre_abono_pagos";

interface Row {
  order: Order;
  kind: IssueKind;
  issue: string;
  gap: number;
}

const KIND_LABEL: Record<IssueKind, { label: string; className: string }> = {
  despachado_sin_pago: { label: "Despachado sin pago completo", className: "bg-amber-500 text-white" },
  pagado_sin_registro: { label: "Pagado sin respaldo de pagos", className: "bg-sky-600 text-white" },
  soporte_final_sin_pago: { label: "Soporte final sin registro", className: "bg-destructive text-white" },
  soporte_sin_abono: { label: "Soporte de pago sin abono", className: "bg-orange-600 text-white" },
  abono_sin_historial: { label: "Abono sin historial de pago", className: "bg-violet-600 text-white" },
  descuadre_abono_pagos: { label: "Descuadre abono vs pagos", className: "bg-rose-600 text-white" },
};


function fmt(n: number) {
  return `$${Math.round(n || 0).toLocaleString("es-CO")}`;
}

/** Comisión aproximada que se deja de causar por el desfase (tarifa base 10%). */
const APPROX_RATE = 0.1;

export default function PaymentConsistencyPanel({
  orders,
  canFix,
}: {
  orders: Order[];
  canFix: boolean;
}) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const relevant = useMemo(
    () =>
      orders.filter((o) => {
        const total = Number(o.total_amount) || 0;
        if (total <= 0) return false;
        if (String(o.payment_method || "").toLowerCase() === "obsequio") return false;
        if (String(o.observations || "").toUpperCase().includes("OBSEQUIO")) return false;
        return true;
      }),
    [orders]
  );


  const ids = useMemo(() => relevant.map((o) => o.id), [relevant]);
  const { data: payments = [] } = useOrderPaymentsByOrderIds(ids);

  const paidByOrder = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of payments) m.set(p.order_id, (m.get(p.order_id) || 0) + Number(p.amount || 0));
    return m;
  }, [payments]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const o of relevant) {
      const total = Number(o.total_amount) || 0;
      const registered = paidByOrder.get(o.id) || 0;
      const finalProof = String(o.payment_proof_url || "").includes("soporte_pago_final");
      const dispatched = ["despachado", "entregado"].includes(String(o.production_status || ""));
      const fullyPaid = isOrderFullyPaid(o);

      if (finalProof && !fullyPaid) {
        out.push({
          order: o,
          kind: "soporte_final_sin_pago",
          issue: "Tiene soporte del pago final pero el pedido no figura como pagado",
          gap: getOrderBalance(o),
        });
        continue;
      }
      if (dispatched && !fullyPaid) {
        out.push({
          order: o,
          kind: "despachado_sin_pago",
          issue: "Pedido despachado o entregado sin pago completo",
          gap: getOrderBalance(o),
        });
        continue;
      }
      if (fullyPaid && registered > 0 && registered < total - 1) {
        out.push({
          order: o,
          kind: "pagado_sin_registro",
          issue: "Marcado como pagado pero la suma de pagos registrados no llega al total",
          gap: total - registered,
        });
      }
    }
    return out.sort((a, b) => b.gap - a.gap);
  }, [relevant, paidByOrder]);

  const totalGap = rows.reduce((s, r) => s + r.gap, 0);
  const commissionGap = (totalGap / IVA_DIVISOR) * APPROX_RATE;

  const fixOrder = async (row: Row) => {
    const total = Number(row.order.total_amount) || 0;
    const registered = paidByOrder.get(row.order.id) || 0;
    const missing = Math.max(total - Math.max(registered, Number(row.order.abono) || 0), 0);
    setBusy(row.order.id);
    try {
      if (missing > 0) {
        const { error: pErr } = await supabase.from("order_payments" as any).insert({
          order_id: row.order.id,
          amount: missing,
          payment_date: new Date().toISOString().slice(0, 10),
          proof_url: row.order.payment_proof_url || null,
          notes: "Saldo conciliado desde Contabilidad",
        } as any);
        if (pErr) throw pErr;
      }
      const { error } = await supabase
        .from("orders")
        .update({ payment_complete: true, abono: total })
        .eq("id", row.order.id);
      if (error) throw error;
      toast.success("Pedido conciliado");
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order_payments_bulk"] });
    } catch (e: any) {
      toast.error("No se pudo conciliar", { description: e.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Pagos inconsistentes
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Pedidos cuyo estado de pago no coincide con los pagos registrados. Afectan
              directamente la causación de comisiones.
            </p>
          </div>
          {rows.length > 0 && (
            <div className="text-right text-xs">
              <div className="font-semibold">{rows.length} pedido(s)</div>
              <div className="text-muted-foreground">Desfase: {fmt(totalGap)}</div>
              <div className="text-muted-foreground">
                Comisión aprox. sin causar: {fmt(commissionGap)}
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">
            Todo cuadra: no hay pedidos con pagos inconsistentes.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Asesor</TableHead>
                  <TableHead>Situación</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Desfase</TableHead>
                  {canFix && <TableHead className="text-right">Acción</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 200).map((r) => (
                  <TableRow key={`${r.order.id}-${r.kind}`}>
                    <TableCell>
                      <OrderCodeBadge code={r.order.order_code} />
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate">{r.order.client_name}</TableCell>
                    <TableCell className="max-w-[150px] truncate text-xs text-muted-foreground">
                      {r.order.advisor_name || "—"}
                    </TableCell>
                    <TableCell className="max-w-[280px]">
                      <Badge className={KIND_LABEL[r.kind].className}>{KIND_LABEL[r.kind].label}</Badge>
                      <p className="text-[11px] text-muted-foreground mt-1">{r.issue}</p>
                    </TableCell>
                    <TableCell className="text-right">{fmt(Number(r.order.total_amount))}</TableCell>
                    <TableCell className="text-right font-semibold">{fmt(r.gap)}</TableCell>
                    {canFix && (
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === r.order.id}
                          onClick={() => fixOrder(r)}
                        >
                          {busy === r.order.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          )}
                          Registrar saldo
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rows.length > 200 && (
              <p className="text-xs text-muted-foreground mt-2">
                Mostrando los 200 desfases más altos de {rows.length}.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
