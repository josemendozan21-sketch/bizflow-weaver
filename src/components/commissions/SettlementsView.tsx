import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { type Order } from "@/hooks/useOrders";
import { useAllOrderPayments } from "@/hooks/useOrderPayments";
import { useAllOrderCharges } from "@/hooks/useOrderCharges";
import { useSettlementActions, useSettlementData, type Settlement } from "@/hooks/useCommissionSettlements";
import { buildSettlement, shiftPeriod, SETTLEMENT_STATUS_LABEL, HISTORY_START_PERIOD, type SettlementLine } from "@/lib/commissionSettlement";
import { periodKey, periodLabel } from "@/lib/commissions";
import { format } from "date-fns";

const money = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;
const fmtD = (d: Date | string | null) => (d ? format(typeof d === "string" ? new Date(d + "T12:00:00") : d, "dd/MM/yyyy") : "—");

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pendiente_liquidacion: "outline", pendiente_pago: "secondary", pago_registrado: "default", en_revision: "destructive", saldado: "default",
};

interface Props {
  orders: Order[];
  mode: "contabilidad" | "asesor";
  /** En modo asesor, el usuario actual */
  advisorId?: string;
  readOnly?: boolean;
}

export function SettlementsView({ orders, mode, advisorId: fixedAdvisor, readOnly }: Props) {
  const { toast } = useToast();
  const { data: payments = {}, isLoading: lp } = useAllOrderPayments();
  const { data: charges = {} } = useAllOrderCharges();
  const { data, isLoading: ls } = useSettlementData();
  const actions = useSettlementActions();

  const nowP = periodKey(new Date());
  const periods = useMemo(() => {
    const out: string[] = [];
    let p = shiftPeriod(nowP, 1);
    const min = shiftPeriod(HISTORY_START_PERIOD, 1);
    while (p >= min) { out.push(p); p = shiftPeriod(p, -1); }
    return out;
  }, [nowP]);
  const [payPeriod, setPayPeriod] = useState(periods.includes(nowP) ? nowP : periods[0]);

  const advisors = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of orders) if (o.advisor_id) m.set(o.advisor_id, o.advisor_name || "Asesor");
    return Array.from(m.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [orders]);
  const [selAdvisor, setSelAdvisor] = useState<string>("");
  const advisorId = fixedAdvisor || selAdvisor;

  const settlements = data?.settlements || [];
  const items = data?.items || [];
  const payouts = data?.payouts || [];

  const draftFor = (aid: string) => {
    const existing = settlements.find((s) => s.advisor_id === aid && s.pay_period === payPeriod);
    const settledIds = new Set(items.filter((i) => i.settlement_id !== existing?.id).map((i) => i.order_id));
    return { existing, draft: buildSettlement({ orders, payments, charges, advisorId: aid, payPeriod, settledOrderIds: settledIds }) };
  };

  const overview = useMemo(() => {
    if (mode !== "contabilidad") return [];
    return advisors.map((a) => {
      const { existing, draft } = draftFor(a.id);
      const paid = payouts.filter((p) => existing && p.settlement_id === existing.id).reduce((s, p) => s + Number(p.amount), 0);
      return { ...a, existing, draft, paid };
    }).filter((r) => r.existing || r.draft.total > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advisors, orders, payments, charges, settlements, items, payouts, payPeriod, mode]);

  if (lp || ls) return <p className="text-sm text-muted-foreground p-4">Cargando liquidaciones…</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{mode === "contabilidad" ? "Contabilidad y Asesores — liquidación de comisiones" : "Mis liquidaciones de comisión"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground [text-wrap:pretty]">
            La comisión se causa en el mes en que el pedido queda <b>al 100%</b> (pago total, soporte de pago y despacho) y se paga el <b>mes siguiente</b>. Sin IVA, sin flete ni cargos adicionales. Los bonos se calculan sobre lo completado en el mes.
          </p>
          <div className="flex flex-wrap gap-2">
            <Select value={payPeriod} onValueChange={setPayPeriod}>
              <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p} value={p}>Pago de {periodLabel(p)} (causado en {periodLabel(shiftPeriod(p, -1))})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {mode === "contabilidad" && (
              <Select value={selAdvisor || "all"} onValueChange={(v) => setSelAdvisor(v === "all" ? "" : v)}>
                <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Asesor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los asesores</SelectItem>
                  {advisors.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {mode === "contabilidad" && !advisorId && (
        <Card>
          <CardContent className="pt-4 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Asesor</TableHead><TableHead className="text-right">Del mes</TableHead><TableHead className="text-right">Pendientes anteriores</TableHead>
                <TableHead className="text-right">Bono</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Pagado</TableHead><TableHead>Estado</TableHead><TableHead />
              </TableRow></TableHeader>
              <TableBody>
                {overview.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No hay comisiones para este pago.</TableCell></TableRow>}
                {overview.map((r) => {
                  const s = r.existing;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-right">{money(s ? s.current_amount : r.draft.currentAmount)}</TableCell>
                      <TableCell className="text-right">{money(s ? s.carryover_amount : r.draft.carryoverAmount)}</TableCell>
                      <TableCell className="text-right">{money(s ? s.bonus_amount : r.draft.bonus)}</TableCell>
                      <TableCell className="text-right font-semibold">{money(s ? s.total_amount : r.draft.total)}</TableCell>
                      <TableCell className="text-right">{money(r.paid)}</TableCell>
                      <TableCell><Badge variant={STATUS_VARIANT[s?.status || "pendiente_liquidacion"]}>{SETTLEMENT_STATUS_LABEL[s?.status || "pendiente_liquidacion"]}</Badge></TableCell>
                      <TableCell><Button size="sm" variant="outline" onClick={() => setSelAdvisor(r.id)}>Ver</Button></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {advisorId && (
        <AdvisorSettlement
          key={advisorId + payPeriod}
          mode={mode}
          readOnly={readOnly}
          advisorName={advisors.find((a) => a.id === advisorId)?.name || "Asesor"}
          advisorId={advisorId}
          {...draftFor(advisorId)}
          payouts={payouts.filter((p) => p.advisor_id === advisorId)}
          savedItems={items}
          logs={data?.logs || []}
          history={settlements.filter((s) => s.advisor_id === advisorId)}
          actions={actions}
          toast={toast}
        />
      )}
    </div>
  );
}

function LinesTable({ lines, title }: { lines: { code: string; client: string; sale: string; completed: string; period: string; pay: string; base: number; rate: number; amount: number }[]; title: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold">{title} ({lines.length})</p>
      <div className="overflow-x-auto border rounded-md">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Pedido</TableHead><TableHead>Cliente</TableHead><TableHead>Venta</TableHead><TableHead>Al 100%</TableHead>
            <TableHead>Mes comisión</TableHead><TableHead>Pago completo</TableHead><TableHead className="text-right">Base sin IVA</TableHead><TableHead className="text-right">%</TableHead><TableHead className="text-right">Comisión</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {lines.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground text-xs">Sin pedidos</TableCell></TableRow>}
            {lines.map((l, i) => (
              <TableRow key={i}>
                <TableCell className="whitespace-nowrap font-mono text-xs">{l.code}</TableCell>
                <TableCell className="max-w-[180px] truncate">{l.client}</TableCell>
                <TableCell className="whitespace-nowrap">{l.sale}</TableCell>
                <TableCell className="whitespace-nowrap">{l.completed}</TableCell>
                <TableCell className="whitespace-nowrap">{periodLabel(l.period)}</TableCell>
                <TableCell className="whitespace-nowrap">{l.pay}</TableCell>
                <TableCell className="text-right">{money(l.base)}</TableCell>
                <TableCell className="text-right">{(l.rate * 100).toFixed(1)}%</TableCell>
                <TableCell className="text-right font-medium">{money(l.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AdvisorSettlement(props: any) {
  const { mode, readOnly, advisorName, advisorId, existing, draft, payouts, savedItems, logs, history, actions, toast } = props as {
    mode: "contabilidad" | "asesor"; readOnly?: boolean; advisorName: string; advisorId: string; existing?: Settlement;
    draft: ReturnType<typeof buildSettlement>; payouts: any[]; savedItems: any[]; logs: any[]; history: Settlement[];
    actions: ReturnType<typeof useSettlementActions>; toast: any;
  };
  const [adjust, setAdjust] = useState(String(existing?.adjustment_amount || 0));
  const [notes, setNotes] = useState(existing?.notes || "");
  const [dlg, setDlg] = useState<null | "return" | "pay" | "dispute">(null);
  const [note, setNote] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payRef, setPayRef] = useState("");
  const [payFile, setPayFile] = useState<File | null>(null);

  const isCont = mode === "contabilidad" && !readOnly;
  const locked = existing?.status === "saldado";
  const showSaved = !!existing && (locked || existing.status === "pago_registrado" || mode === "asesor");
  const myPayouts = payouts.filter((p) => existing && p.settlement_id === existing.id);
  const paid = myPayouts.reduce((s, p) => s + Number(p.amount), 0);
  const total = existing ? Number(existing.total_amount) : draft.total;
  const myLogs = logs.filter((l) => existing && l.settlement_id === existing.id);

  const toRow = (l: SettlementLine) => ({ code: l.order.order_code || l.order.id.slice(0, 8), client: l.order.client_name, sale: fmtD(l.saleDate), completed: fmtD(l.completedDate), period: l.causationPeriod, pay: fmtD(l.paidDate), base: l.base, rate: l.rate, amount: l.amount });
  const savedRows = (carry: boolean) => savedItems.filter((i) => existing && i.settlement_id === existing.id && i.is_carryover === carry)
    .map((i) => ({ code: i.order_code || i.order_id.slice(0, 8), client: i.client_name || "", sale: fmtD(i.sale_date), completed: fmtD(i.completed_date), period: i.causation_period, pay: fmtD(i.paid_date), base: Number(i.base_amount), rate: Number(i.rate), amount: Number(i.amount) }));

  const curRows = showSaved ? savedRows(false) : draft.current.map(toRow);
  const carryRows = showSaved ? savedRows(true) : draft.carryover.map(toRow);

  const run = async (fn: () => Promise<any>, ok: string) => {
    try { await fn(); toast({ title: ok }); setDlg(null); setNote(""); }
    catch (e: any) { toast({ title: "No se pudo completar", description: e.message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2 flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{advisorName} · pago de {periodLabel(draft.payPeriod)}</CardTitle>
          <Badge variant={STATUS_VARIANT[existing?.status || "pendiente_liquidacion"]}>{SETTLEMENT_STATUS_LABEL[existing?.status || "pendiente_liquidacion"]}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            <Stat label={`Comisiones de ${periodLabel(draft.causationPeriod)}`} value={existing && showSaved ? existing.current_amount : draft.currentAmount} />
            <Stat label="Pendientes de meses anteriores" value={existing && showSaved ? existing.carryover_amount : draft.carryoverAmount} />
            <Stat label={`Bono (completado ${money(draft.completedTotal)})`} value={existing && showSaved ? existing.bonus_amount : draft.bonus} />
            <Stat label="Ajuste" value={existing ? existing.adjustment_amount : 0} />
            <Stat label="Total a pagar" value={total} strong />
            <Stat label="Pagado · saldo" value={paid} extra={`saldo ${money(Math.max(total - paid, 0))}`} />
          </div>
          {existing?.returned_note && <p className="text-xs text-destructive">Devuelta a revisión: {existing.returned_note}</p>}
          {existing?.dispute_note && <p className="text-xs text-destructive">Diferencia reportada por el asesor: {existing.dispute_note}</p>}
          {existing && !showSaved && mode === "contabilidad" && <p className="text-xs text-muted-foreground">La liquidación aprobada se recalculará con los datos actuales si la vuelves a aprobar.</p>}

          {isCont && !locked && (
            <div className="grid gap-2 md:grid-cols-[180px_1fr_auto] items-end border-t pt-3">
              <div><Label className="text-xs">Ajuste (+/-)</Label><Input type="number" value={adjust} onChange={(e) => setAdjust(e.target.value)} /></div>
              <div><Label className="text-xs">Nota de la liquidación</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: saldo de septiembre pagado por fuera" /></div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={actions.approve.isPending || (existing?.status === "pago_registrado")}
                  onClick={() => run(() => actions.approve.mutateAsync({ advisorId, advisorName, draft, adjustment: Number(adjust) || 0, notes, existingId: existing?.id }), "Liquidación aprobada")}>Aprobar liquidación</Button>
                {existing && <Button size="sm" variant="outline" onClick={() => setDlg("return")}>Devolver a revisión</Button>}
                {existing && <Button size="sm" variant="secondary" onClick={() => { setPayAmount(String(Math.max(total - paid, 0))); setDlg("pay"); }}>Registrar pago</Button>}
              </div>
            </div>
          )}
          {mode === "asesor" && existing && !locked && paid > 0 && (
            <div className="flex flex-wrap gap-2 border-t pt-3">
              <Button size="sm" onClick={() => run(() => actions.respond.mutateAsync({ id: existing.id, confirm: true, note: "" }), "Recepción confirmada")}>Confirmar que recibí el pago</Button>
              <Button size="sm" variant="outline" onClick={() => setDlg("dispute")}>Reportar diferencia</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <LinesTable title={`Comisiones de ${periodLabel(draft.causationPeriod)}`} lines={curRows} />
      <LinesTable title="Pendientes de meses anteriores" lines={carryRows} />

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Pendiente por completar ({draft.pending.length}) — aún no causan comisión</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto max-h-80">
          <Table>
            <TableHeader><TableRow><TableHead>Pedido</TableHead><TableHead>Cliente</TableHead><TableHead>Venta</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Falta</TableHead></TableRow></TableHeader>
            <TableBody>
              {draft.pending.map((p) => (
                <TableRow key={p.order.id}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">{p.order.order_code || p.order.id.slice(0, 8)}</TableCell>
                  <TableCell className="max-w-[180px] truncate">{p.order.client_name}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtD(p.saleDate)}</TableCell>
                  <TableCell className="text-right">{money(Number(p.order.total_amount || 0))}</TableCell>
                  <TableCell className="text-xs">{p.missing.join(", ")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Pagos e historial</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {payouts.length === 0 && <p className="text-muted-foreground text-xs">Sin pagos registrados.</p>}
          {payouts.map((p) => (
            <div key={p.id} className="flex flex-wrap justify-between gap-2 border-b pb-1">
              <span>{fmtD(p.paid_at)} · pago de {periodLabel(p.pay_period)}{p.reference ? ` · ${p.reference}` : ""}{p.notes ? ` · ${p.notes}` : ""}</span>
              <b>{money(Number(p.amount))}</b>
            </div>
          ))}
          {history.length > 0 && (
            <div className="space-y-1">
              <p className="font-semibold text-xs">Liquidaciones</p>
              {history.map((h) => (
                <div key={h.id} className="flex flex-wrap justify-between gap-2 text-xs">
                  <span>Pago de {periodLabel(h.pay_period)}</span>
                  <span>{money(Number(h.total_amount))} · {SETTLEMENT_STATUS_LABEL[h.status]}</span>
                </div>
              ))}
            </div>
          )}
          {myLogs.length > 0 && (
            <div className="space-y-1">
              <p className="font-semibold text-xs">Movimientos de esta liquidación</p>
              {myLogs.map((l) => (
                <p key={l.id} className="text-xs text-muted-foreground">{format(new Date(l.created_at), "dd/MM/yyyy HH:mm")} · {l.action.replace(/_/g, " ")}{l.amount ? ` · ${money(Number(l.amount))}` : ""}{l.actor_name ? ` · ${l.actor_name}` : ""}{l.note ? ` · ${l.note}` : ""}</p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dlg === "pay" ? "Registrar pago de comisión" : dlg === "return" ? "Devolver liquidación a revisión" : "Reportar diferencia"}</DialogTitle></DialogHeader>
          {dlg === "pay" ? (
            <div className="space-y-2">
              <div><Label>Valor pagado</Label><Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} /></div>
              <div><Label>Fecha del pago</Label><Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} /></div>
              <div><Label>Referencia</Label><Input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Transferencia, número…" /></div>
              <div><Label>Comprobante (opcional)</Label><Input type="file" onChange={(e) => setPayFile(e.target.files?.[0] || null)} /></div>
            </div>
          ) : (
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Explica la diferencia" />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlg(null)}>Cancelar</Button>
            <Button onClick={() => {
              if (dlg === "pay") {
                const amt = Number(payAmount);
                if (!(amt > 0)) return toast({ title: "Ingresa un valor mayor a cero", variant: "destructive" });
                run(() => actions.registerPayout.mutateAsync({ settlement: existing!, amount: amt, paidAt: payDate, reference: payRef, file: payFile }), "Pago registrado");
              } else {
                if (!note.trim()) return toast({ title: "Escribe el motivo", variant: "destructive" });
                if (dlg === "return") run(() => actions.returnForReview.mutateAsync({ id: existing!.id, note }), "Liquidación devuelta");
                else run(() => actions.respond.mutateAsync({ id: existing!.id, confirm: false, note }), "Diferencia reportada");
              }
            }}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, strong, extra }: { label: string; value: number; strong?: boolean; extra?: string }) {
  return (
    <div className="rounded-md border p-2 min-w-0">
      <p className="text-xs text-muted-foreground [text-wrap:pretty]">{label}</p>
      <p className={strong ? "text-lg font-bold" : "font-semibold"}>{money(Number(value))}</p>
      {extra && <p className="text-xs text-muted-foreground">{extra}</p>}
    </div>
  );
}
