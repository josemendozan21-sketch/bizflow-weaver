import { CommissionPayments } from "./CommissionPayments";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type Order } from "@/hooks/useOrders";
import { useAllOrderPayments } from "@/hooks/useOrderPayments";
import { useAllOrderCharges } from "@/hooks/useOrderCharges";
import { useSettlementData } from "@/hooks/useCommissionSettlements";
import {
  buildCommissionOverview, ORDER_STATUS_INFO, scheduledPayDate, shiftPeriod, HISTORY_START_PERIOD,
  type OrderCommissionRow, type OrderCommissionStatus,
} from "@/lib/commissionSettlement";
import { periodKey, periodLabel } from "@/lib/commissions";
import { format } from "date-fns";

const money = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;
const fmtD = (d: Date | null) => (d ? format(d, "dd/MM/yyyy") : "—");

const VARIANT: Record<OrderCommissionStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pendiente_pago: "outline", pago_parcial: "outline", falta_soporte: "secondary", falta_entrega: "secondary",
  no_suma: "destructive", lista: "default", en_revision: "secondary", aprobada: "default", pagada: "default",
};

type Filter = "pendientes" | "todos" | OrderCommissionStatus;

interface Props { orders: Order[]; advisorId?: string; mode: "asesor" | "contabilidad" }

export function CommissionPanel({ orders, advisorId: fixed, mode }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: payments = {}, isLoading: lp } = useAllOrderPayments();
  const { data: charges = {} } = useAllOrderCharges();
  const { data, isLoading: ls } = useSettlementData();

  const nowP = periodKey(new Date());
  const periods = useMemo(() => {
    const out: string[] = []; let p = nowP;
    while (p >= HISTORY_START_PERIOD) { out.push(p); p = shiftPeriod(p, -1); }
    return out;
  }, [nowP]);
  const [period, setPeriod] = useState(nowP);
  const advisors = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of orders) if (o.advisor_id) m.set(o.advisor_id, o.advisor_name || "Asesor");
    return Array.from(m.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [orders]);
  const [sel, setSel] = useState("");
  const advisorId = fixed || sel;
  const [filter, setFilter] = useState<Filter>("pendientes");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<OrderCommissionRow | null>(null);
  const [cod, setCod] = useState<{ row: OrderCommissionRow; received: boolean } | null>(null);
  const [codNote, setCodNote] = useState("");
  const [busy, setBusy] = useState(false);

  const ov = useMemo(() => advisorId ? buildCommissionOverview({
    orders, payments, charges, advisorId, period,
    settlements: data?.settlements || [], items: data?.items || [], payouts: data?.payouts || [], allocations: data?.allocations || [],
  }) : null, [orders, payments, charges, advisorId, period, data]);

  const rows = useMemo(() => {
    if (!ov) return [];
    const s = q.trim().toLowerCase();
    const pend: OrderCommissionStatus[] = ["pendiente_pago", "pago_parcial", "falta_soporte", "falta_entrega"];
    return ov.rows.filter((r) => {
      if (filter === "pendientes" && !pend.includes(r.status)) return false;
      if (filter !== "pendientes" && filter !== "todos" && r.status !== filter) return false;
      if (s && !`${r.order.order_code || ""} ${r.order.client_name || ""}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [ov, filter, q]);

  const payDate = scheduledPayDate(shiftPeriod(period, 1));

  const confirmCod = async () => {
    if (!cod) return;
    if (!cod.received && !codNote.trim()) return toast({ title: "Escribe el motivo", variant: "destructive" });
    setBusy(true);
    const { error } = await (supabase as any).rpc("confirm_cod_delivery", {
      _order_id: cod.row.order.id, _received: cod.received, _reason: codNote.trim() || null, _proof_url: null,
    });
    setBusy(false);
    if (error) return toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    toast({ title: cod.received ? "Entrega confirmada: suma a tu comisión" : "Marcado como no cobrado" });
    setCod(null); setCodNote("");
    qc.invalidateQueries();
  };

  if (lp || ls) return <p className="text-sm text-muted-foreground p-4">Cargando comisiones…</p>;

  const c = ov?.cards;
  const cards: { label: string; value: number; help: string; strong?: boolean }[] = c ? [
    { label: `Ventas de ${periodLabel(period)}`, value: c.ventasMes, help: "Pedidos vendidos en el mes, sin IVA" },
    { label: `Recaudado en ${periodLabel(period)}`, value: c.recaudadoMes, help: "Pagos recibidos en el mes (incluye pedidos de meses anteriores)" },
    { label: "Comisiones futuras", value: c.futuras, help: "Lo que ganarás cuando el cliente pague el saldo" },
    { label: "Comisiones causadas", value: c.causadas, help: "Respaldadas por pagos ya recibidos" },
    { label: "Pendientes de requisitos", value: c.pendientesRequisitos, help: "Causadas, pero al pedido le falta algo" },
    { label: "Disponibles para liquidar", value: c.disponibles, help: "Cumplen todo; entran en la próxima liquidación", strong: true },
    { label: "Aprobadas", value: c.aprobadas, help: `Aprobadas por Contabilidad, por transferir` },
    { label: "Pagadas", value: c.pagadas, help: "Confirmadas y aplicadas al período seleccionado" },
  ] : [];

  return (
    <div className="space-y-4 min-w-0">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{mode === "asesor" ? "Mis comisiones" : "Comisiones por asesor"}</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {mode === "contabilidad" && (
            <Select value={sel} onValueChange={setSel}>
              <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Elige un asesor" /></SelectTrigger>
              <SelectContent>{advisors.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{periods.map((p) => <SelectItem key={p} value={p}>{periodLabel(p)}</SelectItem>)}</SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground w-full [text-wrap:pretty]">
            Lo que quede listo en {periodLabel(period)} se paga hacia el <b>{format(payDate, "dd/MM/yyyy")}</b>, solo si Contabilidad aprueba la liquidación.
            Las cifras son etapas del mismo dinero: no se suman entre sí.
          </p>
        </CardContent>
      </Card>

      {!advisorId && <p className="text-sm text-muted-foreground">Elige un asesor para ver sus comisiones.</p>}

      {ov && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {cards.map((k) => (
              <Card key={k.label} className={k.strong ? "border-primary" : ""}>
                <CardContent className="p-3 min-w-0">
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className={k.strong ? "text-xl font-bold text-primary" : "text-lg font-semibold"}>{money(k.value)}</p>
                  <p className="text-[11px] text-muted-foreground [text-wrap:pretty]">{k.help}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{mode === "asesor" ? "Mis pedidos con comisiones pendientes" : "Pedidos del asesor"}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Input className="w-full sm:w-64" placeholder="Buscar cliente o pedido" value={q} onChange={(e) => setQ(e.target.value)} />
                <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                  <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendientes">Solo pendientes</SelectItem>
                    <SelectItem value="todos">Todos los pedidos</SelectItem>
                    {(Object.keys(ORDER_STATUS_INFO) as OrderCommissionStatus[]).map((s) => <SelectItem key={s} value={s}>{ORDER_STATUS_INFO[s].label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground self-center">{rows.length} pedidos · incluye meses anteriores</span>
              </div>
              <div className="overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Pedido</TableHead><TableHead>Fecha</TableHead><TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor sin IVA</TableHead><TableHead className="text-right">Comisión</TableHead>
                    <TableHead className="text-right">Recaudado</TableHead><TableHead className="text-right">Saldo cliente</TableHead>
                    <TableHead className="text-right">Causada</TableHead><TableHead className="text-right">Por causar</TableHead>
                    <TableHead>Estado</TableHead><TableHead>Acción</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {rows.length === 0 && <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">Sin pedidos en este filtro.</TableCell></TableRow>}
                    {rows.map((r) => (
                      <TableRow key={r.order.id} className="cursor-pointer" onClick={() => setDetail(r)}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">{r.order.order_code || r.order.id.slice(0, 8)}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmtD(r.saleDate)}</TableCell>
                        <TableCell className="max-w-[160px] truncate">{r.order.client_name}</TableCell>
                        <TableCell className="text-right">{money(r.base)}</TableCell>
                        <TableCell className="text-right">{money(r.estimated)}</TableCell>
                        <TableCell className="text-right">{money(r.collected)}</TableCell>
                        <TableCell className="text-right">{money(r.balance)}</TableCell>
                        <TableCell className="text-right">{money(r.caused)}</TableCell>
                        <TableCell className="text-right">{money(r.future)}</TableCell>
                        <TableCell><Badge variant={VARIANT[r.status]} className="whitespace-nowrap" title={ORDER_STATUS_INFO[r.status].help}>{ORDER_STATUS_INFO[r.status].label}</Badge></TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {r.status === "falta_entrega" && mode === "asesor" ? (
                            <div className="flex gap-1">
                              <Button size="sm" onClick={() => setCod({ row: r, received: true })}>Recibido y pagado</Button>
                              <Button size="sm" variant="outline" onClick={() => setCod({ row: r, received: false })}>No cobrado</Button>
                            </div>
                          ) : r.balance > 0 && r.status !== "no_suma" ? (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Cobrar {money(r.balance)}</span>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <CommissionPayments advisors={advisors} advisorId={advisorId || undefined} period={period} editable={mode === "contabilidad"} />

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pedido {detail?.order.order_code || ""}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">{ORDER_STATUS_INFO[detail.status].label}: {ORDER_STATUS_INFO[detail.status].help}</p>
              <Row k="Cliente" v={detail.order.client_name} />
              <Row k="Valor de la venta (con IVA)" v={money(Number(detail.order.total_amount || 0))} />
              <Row k="Base sin IVA" v={money(detail.base)} />
              <Row k="Porcentaje aplicado" v={`${(detail.rate * 100).toFixed(1)}%`} />
              <Row k="Comisión calculada" v={money(detail.estimated)} />
              <Row k="Comisión ya pagada" v={money(detail.commissionPaid)} />
              <Row k="Comisión pendiente" v={money(detail.commissionRemaining)} />
              <Row k="Pagos recibidos" v={money(detail.collected)} />
              <Row k="Saldo pendiente" v={money(detail.balance)} />
              <Row k="Comprobante" v={detail.order.payment_proof_url ? "Sí" : (payments[detail.order.id] || []).some((p) => p.proof_url) ? "Sí" : "No"} />
              <Row k="Despacho" v={fmtD(detail.order.dispatched_at ? new Date(detail.order.dispatched_at) : null)} />
              {detail.order.payment_method === "contra_entrega" && <Row k="Contraentrega" v={({ cobrado: "Recibido y pagado", no_cobrado: "No cobrado", pendiente: "Por confirmar" } as Record<string, string>)[(detail.order as any).cod_confirmation] || "Sin confirmar"} />}
              {(detail.order as any).cod_reason && <Row k="Nota / motivo" v={(detail.order as any).cod_reason} />}
              <Row k="Fecha venta" v={fmtD(detail.saleDate)} />
              <Row k="Quedó al 100%" v={fmtD(detail.completedDate)} />
              {detail.completedDate && <Row k="Pago estimado" v={format(scheduledPayDate(shiftPeriod(periodKey(detail.completedDate), 1)), "dd/MM/yyyy") + " (si Contabilidad aprueba)"} />}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!cod} onOpenChange={(o) => !o && setCod(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{cod?.received ? "Confirmar: el cliente recibió y pagó" : "El cliente no recibió o no pagó"}</DialogTitle></DialogHeader>
          <p className="text-sm">{cod?.row.order.client_name} · {money(Number(cod?.row.order.total_amount || 0))}</p>
          <Textarea value={codNote} onChange={(e) => setCodNote(e.target.value)} placeholder={cod?.received ? "Nota (opcional)" : "Motivo (obligatorio)"} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCod(null)}>Cancelar</Button>
            <Button disabled={busy} onClick={confirmCod}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-2 border-b py-1"><span className="text-muted-foreground">{k}</span><span className="font-medium text-right">{v}</span></div>;
}
