import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";
import { useCreateOrderDispute } from "@/hooks/useOrderDisputes";

interface Props {
  orderId: string;
  orderCode?: string | null;
  clientName?: string;
  currentAmount: number;
  trigger?: React.ReactNode;
}

export default function OrderDisputeDialog({
  orderId,
  orderCode,
  clientName,
  currentAmount,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [proposed, setProposed] = useState("");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState<File | null>(null);
  const create = useCreateOrderDispute();

  const submit = async () => {
    const value = parseFloat(proposed) || 0;
    if (value <= 0 || !reason.trim()) return;
    await create.mutateAsync({
      order_id: orderId,
      current_amount: currentAmount,
      proposed_amount: value,
      reason: reason.trim(),
      evidence,
    });
    setOpen(false);
    setProposed("");
    setReason("");
    setEvidence(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="gap-1 text-xs">
            <AlertTriangle className="h-3.5 w-3.5" /> Solicitar corrección
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar corrección de valor</DialogTitle>
          <DialogDescription>
            {orderCode ? `Pedido ${orderCode}` : "Pedido"}
            {clientName ? ` · ${clientName}` : ""} · Valor actual $
            {Math.round(currentAmount).toLocaleString("es-CO")}. Contabilidad revisará y
            aprobará el nuevo valor.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Valor correcto propuesto</Label>
            <Input
              type="number"
              min={1}
              value={proposed}
              onChange={(e) => setProposed(e.target.value)}
              placeholder="Ej. 550000"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Motivo</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explica por qué el valor registrado no corresponde"
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Soporte (opcional)</Label>
            <Input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setEvidence(e.target.files?.[0] || null)}
            />
          </div>
          <Button
            className="w-full"
            onClick={submit}
            disabled={create.isPending || !(parseFloat(proposed) > 0) || !reason.trim()}
          >
            {create.isPending ? "Enviando..." : "Enviar a Contabilidad"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
