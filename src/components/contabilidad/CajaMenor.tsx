import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wallet, Plus, DollarSign, FileText, Upload, Loader2, Camera, User, Trash2, Pencil } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { openSignedUrl } from "@/lib/signedUrl";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface PettyCashFund {
  id: string;
  amount: number;
  set_by: string;
  notes: string | null;
  created_at: string;
}

interface PettyCashExpense {
  id: string;
  fund_id: string;
  amount: number;
  description: string;
  requested_by: string;
  proof_url: string | null;
  recorded_by: string;
  recorded_by_name: string;
  created_at: string;
}

export default function CajaMenor() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [showFundDialog, setShowFundDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [editingFund, setEditingFund] = useState<PettyCashFund | null>(null);
  const canManage = role === "admin" || role === "contabilidad";

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["petty_cash_funds"] });
    queryClient.invalidateQueries({ queryKey: ["petty_cash_expenses_all"] });
  };

  const deleteFund = async (fund: PettyCashFund) => {
    if (!window.confirm(`¿Eliminar el ingreso de $${Number(fund.amount).toLocaleString("es-CO")}? También se eliminarán sus gastos asociados.`)) return;
    const { error: eErr } = await supabase.from("petty_cash_expenses").delete().eq("fund_id", fund.id);
    if (eErr) { toast.error("Error: " + eErr.message); return; }
    const { error } = await supabase.from("petty_cash_funds").delete().eq("id", fund.id);
    if (error) { toast.error("Error: " + error.message); return; }
    toast.success("Ingreso eliminado");
    refresh();
  };

  const deleteExpense = async (expense: PettyCashExpense) => {
    if (!window.confirm(`¿Eliminar el gasto de $${Number(expense.amount).toLocaleString("es-CO")}?`)) return;
    const { error } = await supabase.from("petty_cash_expenses").delete().eq("id", expense.id);
    if (error) { toast.error("Error: " + error.message); return; }
    toast.success("Gasto eliminado");
    refresh();
  };

  // Fetch all funds (history)
  const { data: funds = [] } = useQuery({
    queryKey: ["petty_cash_funds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("petty_cash_funds")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PettyCashFund[];
    },
  });

  const activeFund = funds[0] ?? null;
  const historyFunds = funds.slice(1);

  // Global cumulative balance across ALL funds (income) and ALL expenses.
  // Each "fund" entry is treated as an income deposit into caja menor.
  const totalIncome = funds.reduce((s, f) => s + Number(f.amount), 0);

  // Fetch ALL expenses across funds (for active + history)
  const { data: allExpenses = [] } = useQuery({
    queryKey: ["petty_cash_expenses_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("petty_cash_expenses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PettyCashExpense[];
    },
  });

  const expenses = activeFund
    ? allExpenses.filter((e) => e.fund_id === activeFund.id)
    : [];

  const totalExpensesAll = allExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const currentBalance = totalIncome - totalExpensesAll;

  return (
    <div className="space-y-6">
      {/* Balance overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totalIncome.toLocaleString("es-CO")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total gastado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">${totalExpensesAll.toLocaleString("es-CO")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo disponible</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${currentBalance <= 0 ? "text-destructive" : "text-primary"}`}>
              ${currentBalance.toLocaleString("es-CO")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => setShowFundDialog(true)} disabled={!canManage}>
          <Wallet className="h-4 w-4 mr-1" /> {activeFund ? "Registrar ingreso" : "Establecer fondo inicial"}
        </Button>
        {activeFund && (
          <Button variant="outline" onClick={() => setShowExpenseDialog(true)} disabled={!canManage}>
            <Plus className="h-4 w-4 mr-1" /> Registrar gasto
          </Button>
        )}
        {activeFund && canManage && (
          <>
            <Button variant="outline" onClick={() => setEditingFund(activeFund)}>
              <Pencil className="h-4 w-4 mr-1" /> Editar último ingreso
            </Button>
            <Button variant="ghost" className="text-destructive" onClick={() => deleteFund(activeFund)}>
              <Trash2 className="h-4 w-4 mr-1" /> Eliminar último ingreso
            </Button>
          </>
        )}
      </div>

      {/* Expense list */}
      {expenses.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {activeFund ? "No hay gastos registrados aún." : "Establece un fondo inicial para comenzar."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Gastos registrados ({expenses.length})</h3>
          <div className="grid gap-3">
            {expenses.map((expense) => {
              const runningBalance = Number(activeFund!.amount) - expenses
                .filter((e) => new Date(e.created_at) <= new Date(expense.created_at))
                .reduce((s, e) => s + Number(e.amount), 0);
              return (
                <Card key={expense.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-destructive">-${Number(expense.amount).toLocaleString("es-CO")}</span>
                          <Badge variant="outline" className="text-xs">
                            Saldo: ${runningBalance.toLocaleString("es-CO")}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-foreground">{expense.description}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> Solicitó: <span className="font-medium text-foreground">{expense.requested_by}</span>
                          </span>
                          <span>Registró: {expense.recorded_by_name}</span>
                          <span>{format(new Date(expense.created_at), "d MMM yyyy HH:mm", { locale: es })}</span>
                        </div>
                      </div>
                      {expense.proof_url && (
                        <Button size="sm" variant="ghost" className="shrink-0"
                          onClick={() => openSignedUrl(expense.proof_url!)}>
                          <FileText className="h-4 w-4 mr-1" /> Soporte
                        </Button>
                      )}
                      {canManage && (
                        <Button size="sm" variant="ghost" className="shrink-0 text-destructive"
                          onClick={() => deleteExpense(expense)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Fund Dialog */}
      <FundDialog
        open={showFundDialog}
        onClose={() => setShowFundDialog(false)}
        currentAmount={activeFund?.amount}
        userId={user?.id || ""}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["petty_cash_funds"] });
          setShowFundDialog(false);
        }}
      />

      {/* Expense Dialog */}
      {activeFund && (
        <ExpenseDialog
          open={showExpenseDialog}
          onClose={() => setShowExpenseDialog(false)}
          fundId={activeFund.id}
          currentBalance={currentBalance}
          userId={user?.id || ""}
          userName={user?.email || "Contabilidad"}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["petty_cash_expenses_all"] });
            setShowExpenseDialog(false);
          }}
        />
      )}

      {/* Edit fund Dialog */}
      <EditFundDialog
        fund={editingFund}
        onClose={() => setEditingFund(null)}
        onSaved={() => { setEditingFund(null); refresh(); }}
      />

      {/* History of previous funds */}
      {historyFunds.length > 0 && (
        <div className="space-y-2 pt-4">
          <h3 className="text-sm font-semibold text-foreground">
            Historial de fondos anteriores ({historyFunds.length})
          </h3>
          <Accordion type="multiple" className="space-y-2">
            {historyFunds.map((fund) => {
              const fundExpenses = allExpenses
                .filter((e) => e.fund_id === fund.id)
                .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
              const spent = fundExpenses.reduce((s, e) => s + Number(e.amount), 0);
              const closing = Number(fund.amount) - spent;
              return (
                <AccordionItem
                  key={fund.id}
                  value={fund.id}
                  className="border rounded-md px-3 bg-card"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex flex-1 items-center justify-between gap-3 pr-2 text-left">
                      <div>
                        <p className="text-sm font-medium">
                          {format(new Date(fund.created_at), "d MMM yyyy HH:mm", { locale: es })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Fondo ${Number(fund.amount).toLocaleString("es-CO")} ·
                          {" "}{fundExpenses.length} mov.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="text-destructive border-destructive/40">
                          -${spent.toLocaleString("es-CO")}
                        </Badge>
                        <Badge variant="outline">
                          Cierre: ${closing.toLocaleString("es-CO")}
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {fund.notes && (
                      <p className="text-xs text-muted-foreground mb-2 italic">{fund.notes}</p>
                    )}
                    {fundExpenses.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">Sin gastos en este fondo.</p>
                    ) : (
                      <div className="space-y-2">
                        {fundExpenses.map((expense) => (
                          <div
                            key={expense.id}
                            className="flex items-start justify-between gap-3 p-2 rounded border bg-background"
                          >
                            <div className="space-y-0.5 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-destructive text-sm">
                                  -${Number(expense.amount).toLocaleString("es-CO")}
                                </span>
                              </div>
                              <p className="text-xs text-foreground">{expense.description}</p>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                                <span>Solicitó: <span className="font-medium text-foreground">{expense.requested_by}</span></span>
                                <span>· Registró: {expense.recorded_by_name}</span>
                                <span>· {format(new Date(expense.created_at), "d MMM HH:mm", { locale: es })}</span>
                              </div>
                            </div>
                            {expense.proof_url && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="shrink-0 h-7"
                                onClick={() => openSignedUrl(expense.proof_url!)}
                              >
                                <FileText className="h-3 w-3 mr-1" /> Soporte
                              </Button>
                            )}
                            {canManage && (
                              <Button size="sm" variant="ghost" className="shrink-0 h-7 text-destructive"
                                onClick={() => deleteExpense(expense)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {canManage && (
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" className="h-7" onClick={() => setEditingFund(fund)}>
                          <Pencil className="h-3 w-3 mr-1" /> Editar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => deleteFund(fund)}>
                          <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                        </Button>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}
    </div>
  );
}

function FundDialog({ open, onClose, currentAmount, userId, onSaved }: {
  open: boolean;
  onClose: () => void;
  currentAmount?: number;
  userId: string;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
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
      } as any);
      if (error) throw error;
      toast.success("Fondo de caja menor establecido");
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
          <DialogTitle>Registrar ingreso a caja menor</DialogTitle>
          <DialogDescription>Este monto se suma al saldo disponible actual.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Monto del ingreso *</Label>
            <Input type="number" min="0" placeholder="Ej: 500000" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea placeholder="Descripción o motivo del fondo" value={notes} onChange={(e) => setNotes(e.target.value)} />
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

function ExpenseDialog({ open, onClose, fundId, currentBalance, userId, userName, onSaved }: {
  open: boolean;
  onClose: () => void;
  fundId: string;
  currentBalance: number;
  userId: string;
  userName: string;
  onSaved: () => void;
}) {
  return <ExpenseDialogInner open={open} onClose={onClose} fundId={fundId} currentBalance={currentBalance} userId={userId} userName={userName} onSaved={onSaved} />;
}

function EditFundDialog({ fund, onClose, onSaved }: {
  fund: PettyCashFund | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadedId, setLoadedId] = useState<string | null>(null);

  if (fund && loadedId !== fund.id) {
    setLoadedId(fund.id);
    setAmount(String(fund.amount));
    setNotes(fund.notes ?? "");
  }

  const handleSave = async () => {
    if (!fund) return;
    const val = parseFloat(amount);
    if (!val || val <= 0) { toast.error("Ingrese un monto válido"); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("petty_cash_funds")
        .update({ amount: val, notes: notes.trim() || null } as any)
        .eq("id", fund.id);
      if (error) throw error;
      toast.success("Ingreso actualizado");
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
          <DialogTitle>Editar ingreso de caja menor</DialogTitle>
          <DialogDescription>Corrige el monto o las notas de este ingreso.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
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

function ExpenseDialogInner({ open, onClose, fundId, currentBalance, userId, userName, onSaved }: {
  open: boolean;
  onClose: () => void;
  fundId: string;
  currentBalance: number;
  userId: string;
  userName: string;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) { toast.error("Ingrese un monto válido"); return; }
    if (!description.trim()) { toast.error("Describa para qué es el gasto"); return; }
    if (!requestedBy.trim()) { toast.error("Indique quién solicitó el dinero"); return; }
    if (val > currentBalance) { toast.error(`Saldo insuficiente. Disponible: $${currentBalance.toLocaleString("es-CO")}`); return; }

    setSaving(true);
    try {
      let proofUrl: string | null = null;

      if (proofFile) {
        const ext = proofFile.name.split(".").pop();
        const path = `${fundId}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("petty-cash-proofs").upload(path, proofFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("petty-cash-proofs").getPublicUrl(path);
        proofUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("petty_cash_expenses").insert({
        fund_id: fundId,
        amount: val,
        description: description.trim(),
        requested_by: requestedBy.trim(),
        proof_url: proofUrl,
        recorded_by: userId,
        recorded_by_name: userName,
      } as any);
      if (error) throw error;

      toast.success("Gasto registrado", { description: `Se descontaron $${val.toLocaleString("es-CO")} de la caja menor.` });
      setAmount("");
      setDescription("");
      setRequestedBy("");
      setProofFile(null);
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
          <DialogDescription>Saldo disponible: ${currentBalance.toLocaleString("es-CO")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
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
            <div className="flex items-center gap-2">
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
