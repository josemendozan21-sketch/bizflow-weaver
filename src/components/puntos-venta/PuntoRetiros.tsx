import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Banknote, Check, X, Paperclip, Plus } from "lucide-react";
import {
  usePosCashWithdrawals,
  useCreateCashWithdrawal,
  useDecideCashWithdrawal,
  uploadPosCashProof,
} from "@/hooks/usePuntosVenta";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Props = { locationId: string };

export function PuntoRetiros({ locationId }: Props) {
  const { role } = useAuth();
  const isAdmin = role === "admin" || role === "contabilidad";
  const isPos = role === "pos_punto";

  const { data: withdrawals = [] } = usePosCashWithdrawals(locationId);
  const create = useCreateCashWithdrawal(locationId);
  const decide = useDecideCashWithdrawal(locationId);

  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setAmount(""); setConcept(""); setNotes(""); setFile(null); setShowForm(false);
  };

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Monto inválido"); return; }
    if (!concept.trim()) { toast.error("Indica el motivo / qué se retira"); return; }
    try {
      setUploading(true);
      let proof_url: string | null = null;
      if (file) proof_url = await uploadPosCashProof(file, locationId);
      await create.mutateAsync({ amount: amt, concept, notes, proof_url });
      toast.success("Retiro registrado, pendiente de aprobación");
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
          <Banknote className="h-5 w-5" /> Retiros de caja
        </CardTitle>
        {(isPos || isAdmin) && !showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> Registrar retiro
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="rounded-lg border bg-muted/40 p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Monto</Label>
              <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Motivo / qué se retira</Label>
              <Input value={concept} onChange={(e) => setConcept(e.target.value)}
                placeholder="Ej: Recogida diaria, gasto papelería" />
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
          <p className="text-sm text-muted-foreground text-center py-4">Sin retiros registrados.</p>
        ) : (
          <div className="space-y-2">
            {withdrawals.map((w) => (
              <div key={w.id} className="border rounded-md p-3 flex flex-col md:flex-row md:items-center gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
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
                  <a href={w.proof_url} target="_blank" rel="noreferrer"
                    className="text-xs inline-flex items-center gap-1 text-primary hover:underline">
                    <Paperclip className="h-3 w-3" /> Soporte
                  </a>
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