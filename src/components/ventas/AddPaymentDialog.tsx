import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus } from "lucide-react";
import { useCreateOrderPayment, uploadPaymentProof } from "@/hooks/useOrderPayments";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  orderId: string;
  pendingBalance: number;
  trigger?: React.ReactNode;
}

export function AddPaymentDialog({ orderId, pendingBalance, trigger }: Props) {
  const { user } = useAuth();
  const create = useCreateOrderPayment();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);

  const reset = () => {
    setAmount("");
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setMethod("");
    setNotes("");
    setFile(null);
  };

  const handleSubmit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }
    setSubmitting(true);
    try {
      let proofUrl: string | null = null;
      if (file) proofUrl = await uploadPaymentProof(orderId, file);

      await create.mutateAsync({
        order_id: orderId,
        amount: amt,
        payment_date: paymentDate,
        proof_url: proofUrl,
        notes: notes.trim() || null,
        method: method.trim() || null,
        recorded_by: user?.id || null,
        recorded_by_name: user?.email || null,
      });
      setOpen(false);
      reset();
    } catch (err: any) {
      toast.error("Error al registrar abono", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" /> Registrar abono
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar abono</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {pendingBalance > 0 && (
            <p className="text-sm text-muted-foreground">
              Saldo pendiente actual:{" "}
              <span className="font-semibold text-foreground">
                ${pendingBalance.toLocaleString("es-CO")}
              </span>
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Monto *</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Método (opcional)</Label>
            <Input
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              placeholder="Transferencia, efectivo, Nequi…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Comprobante (imagen / PDF)</Label>
            <Input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles del pago…"
              rows={2}
            />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={submitting || !amount}>
            {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            Guardar abono
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}