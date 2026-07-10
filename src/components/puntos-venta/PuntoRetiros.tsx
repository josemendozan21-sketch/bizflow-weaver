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

type Props = { locationId: string; cashBase?: number };

export function PuntoRetiros({ locationId, cashBase = 0 }: Props) {
  const { role } = useAuth();
  const isAdmin = role === "admin" || role === "contabilidad";
  const isPos = role === "pos_punto";

  const { data: withdrawals = [] } = usePosCashWithdrawals(locationId);
  const { data: sales = [] } = usePosSales(locationId);
  const create = useCreateCashWithdrawal(locationId);
  const decide = useDecideCashWithdrawal(locationId);

  const [showForm, setShowForm] = useState(false);
  const [movementType, setMovementType] = useState<"retiro" | "consignacion">("retiro");
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const isCash = (m: string | null | undefined) =>
    (m ?? "").toLowerCase().split("+").some((p) => p.trim() === "efectivo");
  const cashSalesToday = sales
    .filter((s) => s.sale_date.slice(0, 10) === today && isCash(s.payment_method))
    .reduce((a, b) => a + Number(b.total_amount), 0);
  const cashSalesAll = sales
    .filter((s) => isCash(s.payment_method))
    .reduce((a, b) => a + Number(b.total_amount), 0);
  const approvedRetiros = withdrawals
    .filter((w) => w.status === "aprobado" && (w.movement_type ?? "retiro") === "retiro")
    .reduce((a, b) => a + Number(b.amount), 0);
  const approvedConsignaciones = withdrawals
    .filter((w) => w.status === "aprobado" && w.movement_type === "consignacion")
    .reduce((a, b) => a + Number(b.amount), 0);
  const pendingRetiros = withdrawals
    .filter((w) => w.status === "pendiente" && (w.movement_type ?? "retiro") === "retiro")
    .reduce((a, b) => a + Number(b.amount), 0);
  const pendingConsignaciones = withdrawals
    .filter((w) => w.status === "pendiente" && w.movement_type === "consignacion")
    .reduce((a, b) => a + Number(b.amount), 0);
  const pendingTotal = pendingRetiros + pendingConsignaciones;
  // Descontamos también los movimientos pendientes: el dinero ya salió físicamente
  // de la caja aunque contabilidad no los haya aprobado todavía.
  const cashOnHand =
    cashBase + cashSalesAll
    - approvedRetiros - approvedConsignaciones
    - pendingRetiros - pendingConsignaciones;

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
      await create.mutateAsync({ amount: amt, concept, notes, proof_url, movement_type: movementType });
      toast.success(`${movementType === "retiro" ? "Retiro" : "Consignación"} registrado, pendiente de aprobación`);
      reset();
    } catch (e: any) {
      toast.error(e.message ?? "Error al registrar retiro");
    } finally {
      setUploading(false);
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
        )}
      </CardContent>
    </Card>
  );
}