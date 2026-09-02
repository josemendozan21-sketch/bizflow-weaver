import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Banknote, Check, X, Paperclip, Plus, ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import {
  usePosCashWithdrawals,
  useCreateCashWithdrawal,
  useDecideCashWithdrawal,
  uploadPosCashProof,
  usePosSales,
} from "@/hooks/usePuntosVenta";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { openSignedUrl } from "@/lib/signedUrl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { computePosCash, isCashMethod } from "@/lib/pettyCash";
import {
  useSedePettyExpenses,
  useSedeCashCounts,
  useCreateSedePettyExpense,
  useCreateSedeCashCount,
} from "@/hooks/usePosPettyCash";

type Props = { locationId: string; cashBase?: number };

export function PuntoRetiros({ locationId, cashBase = 0 }: Props) {
  const { role } = useAuth();
  const isAdmin = role === "admin" || role === "contabilidad";
  const isPos = role === "pos_punto";

  const { data: withdrawals = [] } = usePosCashWithdrawals(locationId);
  const { data: sales = [] } = usePosSales(locationId);
  const { data: posExpenses = [] } = useSedePettyExpenses("chico");
  const { data: counts = [] } = useSedeCashCounts("chico");
  const create = useCreateCashWithdrawal(locationId);
  const decide = useDecideCashWithdrawal(locationId);
  const createExpense = useCreateSedePettyExpense("chico");
  const createCount = useCreateSedeCashCount("chico");

  const [showForm, setShowForm] = useState(false);
  const [movementType, setMovementType] = useState<"retiro" | "consignacion" | "gasto">("retiro");
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showCount, setShowCount] = useState(false);
  const [countedAmount, setCountedAmount] = useState("");
  const [countNotes, setCountNotes] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const isCash = isCashMethod;
  const lastCount = counts[0] ?? null;
  const cash = computePosCash({
    cashBase,
    lastCount,
    sales,
    withdrawals,
    expenses: posExpenses,
  });
  const cashSalesToday = sales
    .filter((s) => s.sale_date.slice(0, 10) === today && isCash(s.payment_method))
    .reduce((a, b) => a + Number(b.total_amount), 0);
  const cashSalesAll = cash.cashSales;
  const approvedRetiros = cash.retiros;
  const approvedConsignaciones = cash.consignaciones;
  const pendingTotal = cash.pending + cash.gastosPendientes;

  // ---- Movimientos diarios de caja (ventas efectivo vs salidas) ----
  const since = lastCount ? +new Date(lastCount.created_at) : -Infinity;
  const after = (d: string) => +new Date(d) > since;
  const dayMap = new Map<string, { sales: number; retiros: number; consignaciones: number; gastos: number }>();
  const bump = (d: string, key: "sales" | "retiros" | "consignaciones" | "gastos", v: number) => {
    const row = dayMap.get(d) ?? { sales: 0, retiros: 0, consignaciones: 0, gastos: 0 };
    row[key] += v;
    dayMap.set(d, row);
  };
  sales
    .filter((s) => isCash(s.payment_method) && after(s.sale_date))
    .forEach((s) => bump(s.sale_date.slice(0, 10), "sales", Number(s.total_amount)));
  withdrawals
    .filter((w) => w.status !== "rechazado" && after(String(w.created_at)))
    .forEach((w) =>
      bump(
        String(w.created_at).slice(0, 10),
        (w.movement_type ?? "retiro") === "consignacion" ? "consignaciones" : "retiros",
        Number(w.amount)
      )
    );
  posExpenses
    .filter((e) => (e.status ?? "aprobado") !== "rechazado" && after(e.created_at))
    .forEach((e) => bump(e.created_at.slice(0, 10), "gastos", Number(e.amount)));
  const dayRowsAsc = Array.from(dayMap.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  let acc = cash.base;
  const dayRows = dayRowsAsc
    .map(([date, r]) => {
      acc += r.sales - r.retiros - r.consignaciones - r.gastos;
      return { date, ...r, balance: acc };
    })
    .reverse();

  const cashOnHand = cash.cashOnHand;

  const reset = () => {
    setAmount(""); setConcept(""); setNotes(""); setFile(null); setShowForm(false); setMovementType("retiro");
  };

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Monto inválido"); return; }
    if (!concept.trim()) { toast.error("Indica el motivo / qué se retira"); return; }
    try {
      setUploading(true);
      let proof_url: string | null = null;
      if (file) proof_url = await uploadPosCashProof(file, locationId);
      if (movementType === "gasto") {
        await createExpense.mutateAsync({
          amount: amt,
          description: notes ? `${concept} — ${notes}` : concept,
          requested_by: "Punto 92",
          proof_url,
        });
        toast.success("Gasto registrado, pendiente de aprobación de contabilidad");
      } else {
        await create.mutateAsync({ amount: amt, concept, notes, proof_url, movement_type: movementType });
        toast.success(`${movementType === "retiro" ? "Retiro" : "Consignación"} registrado, pendiente de aprobación`);
      }
      reset();
    } catch (e: any) {
      toast.error(e.message ?? "Error al registrar el movimiento");
    } finally {
      setUploading(false);
    }
  };

  const submitCount = async () => {
    const counted = parseFloat(countedAmount);
    if (isNaN(counted) || counted < 0) { toast.error("Monto contado inválido"); return; }
    try {
      await createCount.mutateAsync({
        expected_amount: cashOnHand,
        counted_amount: counted,
        notes: countNotes || null,
      });
      toast.success("Arqueo registrado. El saldo queda cuadrado desde este momento.");
      setShowCount(false); setCountedAmount(""); setCountNotes("");
    } catch (e: any) {
      toast.error(e.message ?? "Error al registrar arqueo");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="h-5 w-5" /> Caja
        </CardTitle>
        {(isPos || isAdmin) && !showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> Registrar movimiento
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Banknote className="h-3 w-3" /> Efectivo en caja</div>
            <div className="text-lg font-bold">${cashOnHand.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground mt-1">Base + ventas efectivo − retiros/consignaciones (aprobados y pendientes)</div>
            {pendingTotal > 0 && (
              <div className="text-[10px] text-amber-600 mt-0.5">
                ${pendingTotal.toLocaleString()} en movimientos pendientes de aprobación (ya descontados)
              </div>
            )}
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Base de caja</div>
            <div className="text-lg font-bold">${cashBase.toLocaleString()}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Ventas efectivo</div>
            <div className="text-lg font-bold">${cashSalesAll.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground mt-1">Hoy: ${cashSalesToday.toLocaleString()}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><ArrowUpCircle className="h-3 w-3" /> Retiros aprobados</div>
            <div className="text-lg font-bold">${approvedRetiros.toLocaleString()}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><ArrowDownCircle className="h-3 w-3" /> Consignaciones</div>
            <div className="text-lg font-bold">${approvedConsignaciones.toLocaleString()}</div>
          </div>
        </div>

        {showForm && (
          <div className="rounded-lg border bg-muted/40 p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Tipo de movimiento</Label>
              <Select value={movementType} onValueChange={(v) => setMovementType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="retiro">Retiro de efectivo</SelectItem>
                  <SelectItem value="consignacion">Consignación</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Monto</Label>
              <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>{movementType === "retiro" ? "Motivo / qué se retira" : "Concepto / banco destino"}</Label>
              <Input value={concept} onChange={(e) => setConcept(e.target.value)}
                placeholder={movementType === "retiro"
                  ? "Ej: Recogida diaria, gasto papelería"
                  : "Ej: Consignación Bancolombia cuenta 123"} />
            </div>
            <div className="md:col-span-2">
              <Label>Notas (opcional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <div className="md:col-span-2">
              <Label>Soporte (foto/PDF)</Label>
              <Input type="file" accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button variant="outline" onClick={reset} disabled={uploading}>Cancelar</Button>
              <Button onClick={submit} disabled={uploading || create.isPending}>
                {uploading || create.isPending ? "Guardando…" : "Registrar"}
              </Button>
            </div>
          </div>
        )}

        {withdrawals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin movimientos de caja registrados.</p>
        ) : (
          <>
          {dayRows.length > 0 && (
            <div className="rounded-lg border overflow-x-auto">
              <div className="px-3 py-2 text-xs font-semibold border-b bg-muted/40">
                Resumen diario de caja (saldo acumulado desde la base)
              </div>
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th className="text-left p-2">Fecha</th>
                    <th className="text-right p-2">Ventas efectivo</th>
                    <th className="text-right p-2">Retiros</th>
                    <th className="text-right p-2">Consignaciones</th>
                    <th className="text-right p-2">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {dayRows.slice(0, 31).map((r) => (
                    <tr key={r.date} className="border-b last:border-0">
                      <td className="p-2">{r.date}</td>
                      <td className="p-2 text-right">${r.sales.toLocaleString()}</td>
                      <td className="p-2 text-right text-destructive">
                        {r.retiros ? `-$${r.retiros.toLocaleString()}` : "—"}
                      </td>
                      <td className="p-2 text-right text-destructive">
                        {r.consignaciones ? `-$${r.consignaciones.toLocaleString()}` : "—"}
                      </td>
                      <td className="p-2 text-right font-semibold">${r.balance.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="space-y-2">
            {withdrawals.map((w) => (
              <div key={w.id} className="border rounded-md p-3 flex flex-col md:flex-row md:items-center gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {(w.movement_type ?? "retiro") === "consignacion" ? (
                        <><ArrowDownCircle className="h-3 w-3 mr-1" /> Consignación</>
                      ) : (
                        <><ArrowUpCircle className="h-3 w-3 mr-1" /> Retiro</>
                      )}
                    </Badge>
                    <span className="font-bold">${Number(w.amount).toLocaleString()}</span>
                    <Badge variant={
                      w.status === "aprobado" ? "default" :
                      w.status === "rechazado" ? "destructive" : "secondary"
                    }>{w.status}</Badge>
                  </div>
                  <div className="text-sm">{w.concept}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(w.created_at).toLocaleString()} · {w.requested_by_name ?? "—"}
                    {w.approved_by_name ? ` · ${w.status === "aprobado" ? "Aprobado" : "Rechazado"} por ${w.approved_by_name}` : ""}
                  </div>
                  {w.notes && <div className="text-xs text-muted-foreground">{w.notes}</div>}
                  {w.rejection_reason && <div className="text-xs text-destructive">Motivo: {w.rejection_reason}</div>}
                </div>
                {w.proof_url && (
                  <button type="button" onClick={() => openSignedUrl(w.proof_url!)}
                    className="text-xs inline-flex items-center gap-1 text-primary hover:underline">
                    <Paperclip className="h-3 w-3" /> Soporte
                  </button>
                )}
                {isAdmin && w.status === "pendiente" && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="default"
                      onClick={() => decide.mutate({ id: w.id, status: "aprobado" })}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive"
                      onClick={() => {
                        const reason = prompt("Motivo de rechazo:") ?? "";
                        decide.mutate({ id: w.id, status: "rechazado", rejection_reason: reason });
                      }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}