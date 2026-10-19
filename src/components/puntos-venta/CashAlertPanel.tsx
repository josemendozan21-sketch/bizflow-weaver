import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cashAlertState, parseCOP } from "@/lib/money";
import { formatCOP } from "@/lib/pettyCash";

const db = supabase as any;
const STATUS: Record<string, string> = {
  abierta: "Abierta", recogida_solicitada: "Recogida solicitada", pago_proveedores: "Pago a proveedores", resuelta: "Resuelta",
};

interface Props {
  locationId: string;
  balance: number;
  min: number;
  max: number;
  responsible?: string;
  canAct: boolean;
  /** Abre el formulario para registrar un pago a proveedor ligado a la alerta */
  onSupplierPayment?: (alertId: string) => void;
}

export function useCashAlerts(locationId: string) {
  return useQuery({
    queryKey: ["pos_cash_alerts", locationId],
    queryFn: async () => {
      const { data, error } = await db.from("pos_cash_alerts").select("*, pos_cash_alert_log(*)").eq("location_id", locationId).order("opened_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data as any[];
    },
  });
}

export function CashAlertPanel({ locationId, balance, min, max, responsible = "Eliana Portillo", canAct, onSupplierPayment }: Props) {
  const qc = useQueryClient();
  const { data: alerts = [], isFetched } = useCashAlerts(locationId);
  const state = cashAlertState(balance, min, max);
  const open = alerts.filter((a) => a.status !== "resuelta");
  const [dlg, setDlg] = useState<null | { alert: any; kind: "recogida" | "cerrar" }>(null);
  const [who, setWho] = useState("Jose");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["pos_cash_alerts", locationId] });

  // Abre la alerta automáticamente cuando el saldo sale del rango (una sola por tipo).
  useEffect(() => {
    if (!isFetched || !canAct || state === "ok") return;
    if (open.some((a) => a.alert_type === state)) return;
    db.rpc("open_pos_cash_alert", { _location_id: locationId, _type: state, _balance: Math.round(balance) }).then(({ error }: any) => {
      if (!error) refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFetched, state, balance, open.length]);

  const update = useMutation({
    mutationFn: async (p: { id: string; patch: any; action: string; note?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await db.from("pos_cash_alerts").update(p.patch).eq("id", p.id);
      if (error) throw error;
      await db.from("pos_cash_alert_log").insert({ alert_id: p.id, action: p.action, note: p.note || null, balance: Math.round(balance), actor_name: u.user?.email });
    },
    onSuccess: () => { refresh(); setDlg(null); setNote(""); },
    onError: (e: any) => toast.error(e.message),
  });

  if (state === "ok" && open.length === 0) {
    return (
      <div className="rounded-lg border p-3 text-xs text-muted-foreground flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        Caja dentro del rango: mínimo {formatCOP(min)} · máximo de custodia {formatCOP(max)}.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {open.map((a) => {
        const isMax = a.alert_type === "max";
        const back = isMax ? balance < max : balance >= min;
        return (
          <div key={a.id} className="rounded-lg border-2 border-destructive/50 bg-destructive/5 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div className="min-w-0 text-sm">
                <p className="font-semibold">{isMax ? "Alerta: límite de caja menor alcanzado" : "Alerta: caja menor por debajo del mínimo"}</p>
                <p className="text-muted-foreground [text-wrap:pretty]">
                  {isMax
                    ? `El saldo actual de caja es ${formatCOP(balance)} y alcanzó el límite de ${formatCOP(max)} bajo custodia de ${responsible}. Coordine con Jose o Yeimy la recogida o el pago a proveedores.`
                    : `El saldo actual de caja es ${formatCOP(balance)}, por debajo del mínimo de ${formatCOP(min)}. Coordine con Jose o Yeimy cómo reponerlo.`}
                </p>
                <p className="text-xs mt-1">
                  Estado: <b>{STATUS[a.status]}</b>
                  {a.assigned_to ? ` · gestiona ${a.assigned_to}` : ""}
                  {a.due_date ? ` · fecha ${a.due_date}` : ""}
                  {back ? " · el saldo ya volvió al rango, puede cerrarse" : ""}
                </p>
              </div>
            </div>
            {canAct && (
              <div className="flex flex-wrap gap-2">
                {isMax && <Button size="sm" variant="outline" onClick={() => setDlg({ alert: a, kind: "recogida" })}>Solicitar recogida</Button>}
                {isMax && onSupplierPayment && (
                  <Button size="sm" variant="outline" onClick={() => {
                    update.mutate({ id: a.id, patch: { status: "pago_proveedores", action: "pago_proveedores" }, action: "pago_proveedores" });
                    onSupplierPayment(a.id);
                  }}>Pagar proveedores</Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setDlg({ alert: a, kind: "cerrar" })}>Cerrar alerta</Button>
              </div>
            )}
            {(a.pos_cash_alert_log || []).length > 0 && (
              <div className="text-[11px] text-muted-foreground space-y-0.5">
                {[...a.pos_cash_alert_log].sort((x: any, y: any) => +new Date(x.created_at) - +new Date(y.created_at)).map((l: any) => (
                  <p key={l.id}>{new Date(l.created_at).toLocaleString("es-CO")} · {l.action.replace(/_/g, " ")}{l.balance != null ? ` · saldo ${formatCOP(Number(l.balance))}` : ""}{l.actor_name ? ` · ${l.actor_name}` : ""}{l.note ? ` · ${l.note}` : ""}</p>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dlg?.kind === "recogida" ? "Solicitar recogida del efectivo" : "Cerrar alerta"}</DialogTitle></DialogHeader>
          {dlg?.kind === "recogida" && (
            <div className="grid gap-2">
              <div><Label>Quién gestiona la recogida</Label><Input value={who} onChange={(e) => setWho(e.target.value)} /></div>
              <div><Label>Fecha</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            </div>
          )}
          <div><Label>Nota</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={dlg?.kind === "cerrar" ? "Cómo se resolvió" : "Opcional"} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlg(null)}>Cancelar</Button>
            <Button disabled={update.isPending} onClick={() => {
              if (!dlg) return;
              if (dlg.kind === "recogida") {
                update.mutate({ id: dlg.alert.id, patch: { status: "recogida_solicitada", action: "recogida", assigned_to: who, due_date: date, notes: note || null }, action: "recogida_solicitada", note: `${who} · ${date}${note ? " · " + note : ""}` });
              } else {
                if (!note.trim()) { toast.error("Escribe cómo se resolvió"); return; }
                const { data: _ } = { data: null };
                supabase.auth.getUser().then(({ data: u }) =>
                  update.mutate({ id: dlg.alert.id, patch: { status: "resuelta", resolved_at: new Date().toISOString(), resolved_by: u.user?.id, resolution_note: note }, action: "resuelta", note }));
              }
            }}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Botón para corregir el valor de un movimiento sin borrarlo (solo Contabilidad/Admin). */
export function CorrectAmountButton({ table, id, current, onDone }: { table: "pos_cash_withdrawals" | "petty_cash_expenses" | "petty_cash_counts"; id: string; current: number; onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(String(current));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const parsed = parseCOP(val);
  return (
    <>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setOpen(true)}>Corregir valor</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Corregir valor del movimiento</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Valor actual: {formatCOP(current)}. El registro se conserva y queda la corrección en el historial.</p>
          <div><Label>Valor correcto</Label><Input value={val} onChange={(e) => setVal(e.target.value)} inputMode="numeric" />
            <p className="text-xs text-muted-foreground mt-1">Se guardará como <b>{formatCOP(parsed)}</b></p></div>
          <div><Label>Motivo</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: error de digitación" /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button disabled={busy} onClick={async () => {
              if (!reason.trim()) return toast.error("Escribe el motivo");
              setBusy(true);
              const { error } = await db.rpc("correct_cash_amount", { _table: table, _id: id, _amount: parsed, _reason: reason });
              setBusy(false);
              if (error) return toast.error(error.message);
              toast.success("Valor corregido");
              setOpen(false); onDone?.();
            }}>Guardar corrección</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
