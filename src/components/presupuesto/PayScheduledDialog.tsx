import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useBankAccounts,
  usePayScheduled,
  type ScheduledPayment,
} from "@/hooks/useMonthlyBudget";

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
}

export function PayScheduledDialog({ payment, onClose }: { payment: ScheduledPayment; onClose: () => void }) {
  const pay = usePayScheduled();
  const { data: banks = [] } = useBankAccounts();
  const [paidAmount, setPaidAmount] = useState(String(payment.budgeted_amount));
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [bankId, setBankId] = useState(payment.bank_account_id ?? "");
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    const val = parseFloat(paidAmount);
    if (!val || val <= 0) { toast.error("Monto inválido"); return; }
    if (!bankId) { toast.error("Selecciona el banco"); return; }

    setUploading(true);
    try {
      let proofUrl: string | null = null;
      if (proofFile) {
        const ext = proofFile.name.split(".").pop();
        const path = `${payment.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("budget-receipts").upload(path, proofFile);
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("budget-receipts").getPublicUrl(path);
        proofUrl = data.publicUrl;
      }
      await pay.mutateAsync({
        payment,
        paid_amount: val,
        paid_date: paidDate,
        paid_bank_account_id: bankId,
        proof_url: proofUrl,
        notes: notes.trim() || null,
      });
      toast.success("Pago registrado");
      onClose();
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const diff = (parseFloat(paidAmount) || 0) - Number(payment.budgeted_amount);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar como pagado</DialogTitle>
          <DialogDescription>
            {payment.category}{payment.description ? ` — ${payment.description}` : ""} · Presupuestado: {formatCOP(Number(payment.budgeted_amount))}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Monto real pagado *</Label>
            <Input type="number" min="0" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
            {diff !== 0 && (
              <p className={`text-xs ${diff > 0 ? "text-destructive" : "text-emerald-600"}`}>
                Diferencia: {diff > 0 ? "+" : ""}{formatCOP(diff)}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Fecha de pago *</Label>
            <Input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Banco *</Label>
            <Select value={bankId} onValueChange={setBankId}>
              <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>
                {banks.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name} ({formatCOP(Number(b.current_balance))})</SelectItem>))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Se descontará automáticamente del saldo.</p>
          </div>
          <div className="space-y-1">
            <Label>Soporte</Label>
            <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-primary/40 px-4 py-3 hover:bg-primary/5 w-full justify-center">
              <Camera className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">{proofFile ? proofFile.name : "Adjuntar comprobante"}</span>
              <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
            </label>
          </div>
          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={uploading || pay.isPending}>
            {(uploading || pay.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Confirmar pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}