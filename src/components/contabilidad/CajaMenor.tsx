import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Wallet,
  Plus,
  DollarSign,
  FileText,
  Loader2,
  Camera,
  User,
  Trash2,
  Pencil,
  FileSpreadsheet,
  ArrowDownCircle,
  ArrowUpCircle,
  Scale,
  Check,
  X,
  ArrowLeftRight,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { openSignedUrl } from "@/lib/signedUrl";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { exportPettyCashXlsx } from "@/lib/accountingExports";
import {
  SEDES,
  Sede,
  sedeLabel,
  PettyFund,
  PettyExpense,
  buildMovements,
  withRunningBalance,
  sedeSummary,
  formatCOP,
} from "@/lib/pettyCash";

export default function CajaMenor() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [showFundDialog, setShowFundDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showCountDialog, setShowCountDialog] = useState(false);
  const [editingFund, setEditingFund] = useState<PettyFund | null>(null);
  const [monthFilter, setMonthFilter] = useState<string>("todos");
  const [sedeFilter, setSedeFilter] = useState<"todas" | Sede>("todas");
  const canManage = role === "admin" || role === "contabilidad";

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["petty_cash_funds"] });
    queryClient.invalidateQueries({ queryKey: ["petty_cash_expenses_all"] });
    queryClient.invalidateQueries({ queryKey: ["petty_cash_counts"] });
  };

  const { data: funds = [] } = useQuery({
    queryKey: ["petty_cash_funds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("petty_cash_funds")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PettyFund[];
    },
  });

  const { data: allExpenses = [] } = useQuery({
    queryKey: ["petty_cash_expenses_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("petty_cash_expenses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PettyExpense[];
    },
  });

  const { data: counts = [] } = useQuery({
    queryKey: ["petty_cash_counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("petty_cash_counts" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const movements = buildMovements(funds, allExpenses);
  const toberin = sedeSummary(movements, "toberin");
  const chico = sedeSummary(movements, "chico");
  const totalBalance = toberin.balance + chico.balance;

  const pendingPos = allExpenses.filter(
    (e) => (e.status ?? "aprobado") === "pendiente" && (e.origin ?? "contabilidad") === "punto",
  );

  const deleteFund = async (fund: PettyFund) => {
    if (!window.confirm(`¿Eliminar el movimiento de ${formatCOP(Number(fund.amount))}?`)) return;
    const { error: eErr } = await supabase.from("petty_cash_expenses").delete().eq("fund_id", fund.id);
    if (eErr) { toast.error("Error: " + eErr.message); return; }
    const { error } = await supabase.from("petty_cash_funds").delete().eq("id", fund.id);
    if (error) { toast.error("Error: " + error.message); return; }
    toast.success("Movimiento eliminado");
    refresh();
  };

  const deleteExpense = async (expense: PettyExpense) => {
    if (!window.confirm(`¿Eliminar el gasto de ${formatCOP(Number(expense.amount))}?`)) return;
    const { error } = await supabase.from("petty_cash_expenses").delete().eq("id", expense.id);
    if (error) { toast.error("Error: " + error.message); return; }
    toast.success("Gasto eliminado");
    refresh();
  };

  const decideExpense = async (expense: PettyExpense, approve: boolean) => {
    const reason = approve ? null : window.prompt("Motivo del rechazo:") || "Sin motivo";
    const { error } = await supabase
      .from("petty_cash_expenses")
      .update({
        status: approve ? "aprobado" : "rechazado",
        reviewed_by: user?.id ?? null,
        reviewed_by_name: user?.email ?? "Contabilidad",
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason,
      } as any)
      .eq("id", expense.id);
    if (error) { toast.error("Error: " + error.message); return; }
    toast.success(approve ? "Gasto aprobado" : "Gasto rechazado");
    refresh();
  };

  // ---- Libro de movimientos con saldo acumulado por sede ----
  const chronological = withRunningBalance(
    movements.filter((m) => sedeFilter === "todas" || m.sede === sedeFilter),
  );

  const monthKeys = Array.from(new Set(chronological.map((m) => m.date.slice(0, 7)))).sort((a, b) =>
    a < b ? 1 : -1,
  );
  const visible = chronological
    .filter((m) => monthFilter === "todos" || m.date.slice(0, 7) === monthFilter)
    .slice()
    .reverse();

  const monthIncome = visible
    .filter((m) => m.signedAmount > 0)
    .reduce((s, m) => s + m.amount, 0);
  const monthExpense = visible
    .filter((m) => m.signedAmount < 0)
    .reduce((s, m) => s + m.amount, 0);

  const summaryFor = (s: Sede) => (s === "toberin" ? toberin : chico);
  const activeSede: Sede = sedeFilter === "todas" ? "toberin" : sedeFilter;

  return (
    <div className="space-y-6">
      {/* Saldos por sede */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo total caja menor</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalBalance <= 0 ? "text-destructive" : "text-primary"}`}>
              {formatCOP(totalBalance)}
            </p>
          </CardContent>
        </Card>
        {SEDES.map((s) => {
          const sum = summaryFor(s.value);
          return (
            <Card key={s.value}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className={`text-2xl font-bold ${sum.balance <= 0 ? "text-destructive" : "text-foreground"}`}>
                  {formatCOP(sum.balance)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {sum.lastReset
                    ? `Desde arqueo ${format(new Date(sum.lastReset.date), "d MMM yyyy", { locale: es })} (${formatCOP(sum.lastReset.amount)})`
                    : "Sin arqueo registrado"}
                  {" · "}+{formatCOP(sum.income)} / −{formatCOP(sum.expense)}
                </p>
                {sum.pendingExpense > 0 && (
                  <p className="text-[11px] text-amber-600">
                    Incluye {formatCOP(sum.pendingExpense)} en gastos por aprobar
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Gastos del punto pendientes de aprobación */}
      {canManage && pendingPos.length > 0 && (
        <Card className="border-amber-500/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Gastos del punto por aprobar ({pendingPos.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingPos.map((e) => (
              <div key={e.id} className="flex items-center gap-2 flex-wrap rounded border p-2 text-sm">
                <Badge variant="outline">{sedeLabel(e.sede)}</Badge>
                <span className="font-semibold text-destructive">-{formatCOP(Number(e.amount))}</span>
                <span className="flex-1 min-w-[160px]">{e.description}</span>
                <span className="text-xs text-muted-foreground">{e.recorded_by_name}</span>
                {e.proof_url && (
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => openSignedUrl(e.proof_url!)}>
                    <FileText className="h-3 w-3 mr-1" /> Soporte
                  </Button>
                )}
                <Button size="sm" className="h-7" onClick={() => decideExpense(e, true)}>
                  <Check className="h-3 w-3 mr-1" /> Aprobar
                </Button>
                <Button size="sm" variant="outline" className="h-7" onClick={() => decideExpense(e, false)}>
                  <X className="h-3 w-3 mr-1" /> Rechazar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => setShowFundDialog(true)} disabled={!canManage}>
          <Wallet className="h-4 w-4 mr-1" /> Registrar movimiento
        </Button>
        <Button variant="outline" onClick={() => setShowExpenseDialog(true)} disabled={!canManage}>
          <Plus className="h-4 w-4 mr-1" /> Registrar gasto
        </Button>
        <Button variant="outline" onClick={() => setShowCountDialog(true)} disabled={!canManage}>
          <Scale className="h-4 w-4 mr-1" /> Arqueo de caja
        </Button>
        <Button
          variant="outline"
          className="ml-auto"
          disabled={funds.length === 0 && allExpenses.length === 0}
          onClick={() => {
            exportPettyCashXlsx(funds, allExpenses);
            toast.success("Movimientos de caja menor descargados");
          }}
        >
          <FileSpreadsheet className="h-4 w-4 mr-1" /> Descargar movimientos
        </Button>
      </div>

      {/* Arqueos recientes */}
      {counts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Últimos arqueos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {counts.slice(0, 6).map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-sm flex-wrap">
                <Badge variant="outline">{sedeLabel(c.sede)}</Badge>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(c.count_date + "T12:00:00"), "d MMM yyyy", { locale: es })}
                </span>
                <span>Teórico {formatCOP(Number(c.expected_amount))}</span>
                <span>Contado {formatCOP(Number(c.counted_amount))}</span>
                <span
                  className={
                    Number(c.difference) === 0
                      ? "text-muted-foreground"
                      : Number(c.difference) > 0
                        ? "text-primary font-semibold"
                        : "text-destructive font-semibold"
                  }
                >
                  Diferencia {formatCOP(Number(c.difference))}
                </span>
                {c.notes && <span className="text-xs text-muted-foreground">{c.notes}</span>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Libro de movimientos unificado */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground">
            Movimientos de caja menor ({visible.length})
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={sedeFilter} onValueChange={(v) => setSedeFilter(v as any)}>
              <SelectTrigger className="h-8 w-[190px]">
                <SelectValue placeholder="Sede" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las sedes</SelectItem>
                {SEDES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="h-8 w-[190px]">
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los meses</SelectItem>
                {monthKeys.map((mk) => (
                  <SelectItem key={mk} value={mk}>
                    {format(new Date(mk + "-01T12:00:00"), "MMMM yyyy", { locale: es })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {sedeFilter === "todas" && (
          <p className="text-[11px] text-muted-foreground">
            El saldo acumulado de la lista mezcla ambas sedes. Filtra por sede para ver el saldo real de cada caja.
          </p>
        )}

        <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
          <span>Ingresos del periodo: <span className="font-semibold text-primary">{formatCOP(monthIncome)}</span></span>
          <span>Gastos del periodo: <span className="font-semibold text-destructive">{formatCOP(monthExpense)}</span></span>
          <span>Neto: <span className="font-semibold text-foreground">{formatCOP(monthIncome - monthExpense)}</span></span>
        </div>

        {visible.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No hay movimientos en este periodo.
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-md border divide-y bg-card">
            {visible.map((m) => (
              <div key={m.source + m.id} className="p-3 flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  {m.kind === "saldo_inicial" ? (
                    <Scale className="h-4 w-4 text-muted-foreground" />
                  ) : m.kind === "traslado" ? (
                    <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                  ) : m.signedAmount > 0 ? (
                    <ArrowDownCircle className="h-4 w-4 text-primary" />
                  ) : (
                    <ArrowUpCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={
                        m.kind === "saldo_inicial"
                          ? "font-semibold text-muted-foreground"
                          : m.signedAmount > 0
                            ? "font-semibold text-primary"
                            : "font-semibold text-destructive"
                      }
                    >
                      {m.kind === "saldo_inicial" ? "=" : m.signedAmount > 0 ? "+" : "-"}
                      {formatCOP(m.amount)}
                    </span>
                    <Badge variant="outline" className="text-[10px]">{sedeLabel(m.sede)}</Badge>
                    {m.kind === "saldo_inicial" && (
                      <Badge variant="secondary" className="text-[10px]">Saldo inicial / arqueo</Badge>
                    )}
                    {m.status === "pendiente" && (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/50">Por aprobar</Badge>
                    )}
                    {m.status === "rechazado" && (
                      <Badge variant="outline" className="text-[10px] text-destructive border-destructive/50">Rechazado</Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      Saldo: {formatCOP(m.balance)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(m.date), "d MMM yyyy HH:mm", { locale: es })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words">{m.description}</p>
                  {(m.requestedBy || m.recordedBy) && (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {m.requestedBy && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" /> Solicitó: <span className="font-medium text-foreground">{m.requestedBy}</span>
                        </span>
                      )}
                      {m.recordedBy && <span>Registró: {m.recordedBy}</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {m.proofUrl && (
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => openSignedUrl(m.proofUrl!)}>
                      <FileText className="h-3 w-3 mr-1" /> Soporte
                    </Button>
                  )}
                  {canManage && m.source === "fund" && (
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditingFund(m.raw as PettyFund)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                  {canManage && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-destructive"
                      onClick={() =>
                        m.source === "fund"
                          ? deleteFund(m.raw as PettyFund)
                          : deleteExpense(m.raw as PettyExpense)
                      }
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <FundDialog
        open={showFundDialog}
        onClose={() => setShowFundDialog(false)}
        userId={user?.id || ""}
        defaultSede={activeSede}
        onSaved={() => { refresh(); setShowFundDialog(false); }}
      />

      <ExpenseDialog
        open={showExpenseDialog}
        onClose={() => setShowExpenseDialog(false)}
        defaultSede={activeSede}
        balanceFor={(s) => summaryFor(s).balance}
        userId={user?.id || ""}
        userName={user?.email || "Contabilidad"}
        onSaved={() => { refresh(); setShowExpenseDialog(false); }}
      />

      <CountDialog
        open={showCountDialog}
        onClose={() => setShowCountDialog(false)}
        defaultSede={activeSede}
        expectedFor={(s) => summaryFor(s).balance}
        userId={user?.id || ""}
        userName={user?.email || "Contabilidad"}
        onSaved={() => { refresh(); setShowCountDialog(false); }}
      />

      <EditFundDialog
        fund={editingFund}
        onClose={() => setEditingFund(null)}
        onSaved={() => { setEditingFund(null); refresh(); }}
      />
    </div>
  );
}

/* ------------------------------- Diálogos ------------------------------- */

const KIND_OPTIONS = [
  { value: "ingreso", label: "Ingreso nuevo (entra plata a la caja)" },
  { value: "saldo_inicial", label: "Saldo inicial / ajuste por conteo (fija el saldo, no suma)" },
  { value: "traslado_entrada", label: "Traslado recibido de la otra sede" },
  { value: "traslado_salida", label: "Traslado enviado a la otra sede" },
];

function FundDialog({ open, onClose, userId, defaultSede, onSaved }: {
  open: boolean;
  onClose: () => void;
  userId: string;
  defaultSede: Sede;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [sede, setSede] = useState<Sede>(defaultSede);
  const [kind, setKind] = useState<string>("ingreso");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { toast.error("Ingrese un monto válido"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("petty_cash_funds").insert({
        amount: val,
        set_by: userId,
        notes: notes.trim() || null,
        sede,
        movement_kind: kind,
      } as any);
      if (error) throw error;
      toast.success("Movimiento registrado");
      setAmount(""); setNotes("");
      onSaved();
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar movimiento de caja menor</DialogTitle>
          <DialogDescription>
            Registra solo la plata que entra. Si vas a digitar el efectivo total contado (que ya incluye el
            saldo anterior), elige "Saldo inicial / ajuste por conteo" para que no se sume dos veces.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Sede *</Label>
            <Select value={sede} onValueChange={(v) => setSede(v as Sede)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEDES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo de movimiento *</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Monto *</Label>
            <Input type="number" min="0" placeholder="Ej: 500000" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea placeholder="Descripción o motivo" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Wallet className="h-4 w-4 mr-1" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditFundDialog({ fund, onClose, onSaved }: {
  fund: PettyFund | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [sede, setSede] = useState<Sede>("toberin");
  const [kind, setKind] = useState<string>("ingreso");
  const [saving, setSaving] = useState(false);
  const [loadedId, setLoadedId] = useState<string | null>(null);

  if (fund && loadedId !== fund.id) {
    setLoadedId(fund.id);
    setAmount(String(fund.amount));
    setNotes(fund.notes ?? "");
    setSede((fund.sede as Sede) ?? "toberin");
    setKind(fund.movement_kind ?? "ingreso");
  }

  const handleSave = async () => {
    if (!fund) return;
    const val = parseFloat(amount);
    if (!val || val <= 0) { toast.error("Ingrese un monto válido"); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("petty_cash_funds")
        .update({ amount: val, notes: notes.trim() || null, sede, movement_kind: kind } as any)
        .eq("id", fund.id);
      if (error) throw error;
      toast.success("Movimiento actualizado");
      onSaved();
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!fund} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar movimiento de caja menor</DialogTitle>
          <DialogDescription>Corrige la sede, el tipo, el monto o las notas.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Sede</Label>
            <Select value={sede} onValueChange={(v) => setSede(v as Sede)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEDES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                <SelectItem value="gasto">Gasto (movimiento cargado por error como ingreso)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Monto *</Label>
            <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Pencil className="h-4 w-4 mr-1" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExpenseDialog({ open, onClose, defaultSede, balanceFor, userId, userName, onSaved }: {
  open: boolean;
  onClose: () => void;
  defaultSede: Sede;
  balanceFor: (s: Sede) => number;
  userId: string;
  userName: string;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [sede, setSede] = useState<Sede>(defaultSede);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const currentBalance = balanceFor(sede);

  const handleSave = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { toast.error("Ingrese un monto válido"); return; }
    if (!description.trim()) { toast.error("Describa para qué es el gasto"); return; }
    if (!requestedBy.trim()) { toast.error("Indique quién solicitó el dinero"); return; }
    if (val > currentBalance) {
      toast.error(`Saldo insuficiente en ${sedeLabel(sede)}. Disponible: ${formatCOP(currentBalance)}`);
      return;
    }

    setSaving(true);
    try {
      let proofUrl: string | null = null;
      if (proofFile) {
        const ext = proofFile.name.split(".").pop();
        const path = `${sede}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("petty-cash-proofs").upload(path, proofFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("petty-cash-proofs").getPublicUrl(path);
        proofUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("petty_cash_expenses").insert({
        amount: val,
        description: description.trim(),
        requested_by: requestedBy.trim(),
        proof_url: proofUrl,
        recorded_by: userId,
        recorded_by_name: userName,
        sede,
        origin: "contabilidad",
        status: "aprobado",
      } as any);
      if (error) throw error;

      toast.success("Gasto registrado", {
        description: `Se descontaron ${formatCOP(val)} de la caja de ${sedeLabel(sede)}.`,
      });
      setAmount(""); setDescription(""); setRequestedBy(""); setProofFile(null);
      onSaved();
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar gasto</DialogTitle>
          <DialogDescription>
            Saldo disponible en {sedeLabel(sede)}: {formatCOP(currentBalance)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Sede *</Label>
            <Select value={sede} onValueChange={(v) => setSede(v as Sede)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEDES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Monto *</Label>
            <Input type="number" min="0" placeholder="Ej: 50000" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>¿Para qué? *</Label>
            <Textarea placeholder="Descripción del gasto" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>¿Quién pidió la plata? *</Label>
            <Input placeholder="Nombre de quien solicitó" value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Soporte de pago (opcional)</Label>
            <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-primary/40 px-4 py-3 hover:bg-primary/5 transition-colors w-full justify-center">
              <Camera className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">
                {proofFile ? proofFile.name : "Adjuntar soporte"}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf,.xlsx,.xls"
                className="hidden"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <DollarSign className="h-4 w-4 mr-1" />}
            Descontar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CountDialog({ open, onClose, defaultSede, expectedFor, userId, userName, onSaved }: {
  open: boolean;
  onClose: () => void;
  defaultSede: Sede;
  expectedFor: (s: Sede) => number;
  userId: string;
  userName: string;
  onSaved: () => void;
}) {
  const [sede, setSede] = useState<Sede>(defaultSede);
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");
  const [adjust, setAdjust] = useState(true);
  const [saving, setSaving] = useState(false);

  const expected = expectedFor(sede);
  const countedNum = parseFloat(counted);
  const difference = Number.isFinite(countedNum) ? countedNum - expected : 0;

  const handleSave = async () => {
    if (!Number.isFinite(countedNum) || countedNum < 0) { toast.error("Digite el efectivo contado"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("petty_cash_counts" as any).insert({
        sede,
        expected_amount: expected,
        counted_amount: countedNum,
        difference,
        notes: notes.trim() || null,
        created_by: userId,
        created_by_name: userName,
      } as any);
      if (error) throw error;

      if (adjust && difference !== 0) {
        const { error: adjErr } = await supabase.from("petty_cash_funds").insert({
          amount: countedNum,
          set_by: userId,
          sede,
          movement_kind: "saldo_inicial",
          notes: `Arqueo ${sedeLabel(sede)}: efectivo contado ${formatCOP(countedNum)} (teórico ${formatCOP(expected)}, diferencia ${formatCOP(difference)})${notes.trim() ? ` — ${notes.trim()}` : ""}`,
        } as any);
        if (adjErr) throw adjErr;
      }

      toast.success("Arqueo registrado", {
        description: difference === 0
          ? "El efectivo contado coincide con el saldo del sistema."
          : `Diferencia de ${formatCOP(difference)} ${difference > 0 ? "(sobrante)" : "(faltante)"}.`,
      });
      setCounted(""); setNotes("");
      onSaved();
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Arqueo de caja</DialogTitle>
          <DialogDescription>Cuenta el efectivo físico y compáralo con el saldo del sistema.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Sede *</Label>
            <Select value={sede} onValueChange={(v) => setSede(v as Sede)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEDES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border p-3 text-sm">
            Saldo teórico del sistema: <span className="font-semibold">{formatCOP(expected)}</span>
          </div>
          <div className="space-y-2">
            <Label>Efectivo contado *</Label>
            <Input type="number" min="0" value={counted} onChange={(e) => setCounted(e.target.value)} />
          </div>
          {Number.isFinite(countedNum) && (
            <div className={`text-sm font-semibold ${difference === 0 ? "text-muted-foreground" : difference > 0 ? "text-primary" : "text-destructive"}`}>
              Diferencia: {formatCOP(difference)} {difference > 0 ? "(sobrante)" : difference < 0 ? "(faltante)" : ""}
            </div>
          )}
          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Explicación de la diferencia, si aplica" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={adjust} onChange={(e) => setAdjust(e.target.checked)} />
            Ajustar el saldo del sistema al efectivo contado
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Scale className="h-4 w-4 mr-1" />}
            Guardar arqueo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
