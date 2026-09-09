import { useMemo, useState } from "react";
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
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useCreateOrderDispute, type DisputeKind } from "@/hooks/useOrderDisputes";

interface Props {
  orderId: string;
  orderCode?: string | null;
  clientName?: string;
  currentAmount: number;
  /** "valor" corrige el total del pedido; "pago" confirma que el cliente ya pagó. */
  mode?: DisputeKind;
  /** Monto sugerido a registrar cuando el modo es "pago". */
  suggestedAmount?: number;
  trigger?: React.ReactNode;
}

const PAYMENT_HINTS = ["ya pago", "ya pagó", "saldo", "abono", "pago total", "cancelo", "canceló"];

export default function OrderDisputeDialog({
  orderId,
  orderCode,
  clientName,
  currentAmount,
  mode = "valor",
  suggestedAmount,
  trigger,
}: Props) {
  const isPayment = mode === "pago";
  const [open, setOpen] = useState(false);
  const [proposed, setProposed] = useState(
    isPayment ? String(Math.round(suggestedAmount ?? currentAmount) || "") : ""
  );
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState<File | null>(null);
  const create = useCreateOrderDispute();

  const looksLikePayment = useMemo(() => {
    if (isPayment) return false;
    const r = reason.toLowerCase();
    const value = parseFloat(proposed) || 0;
    const nearlySame = value > 0 && Math.abs(value - currentAmount) <= Math.max(currentAmount * 0.01, 1000);
    return PAYMENT_HINTS.some((h) => r.includes(h)) || nearlySame;
  }, [isPayment, reason, proposed, currentAmount]);

  const submit = async () => {
    const value = parseFloat(proposed) || 0;
    if (value <= 0 || !reason.trim()) return;
    await create.mutateAsync({
      order_id: orderId,
      current_amount: currentAmount,
      proposed_amount: value,
      reason: reason.trim(),
      evidence,
      kind: mode,
    });
    setOpen(false);
    setProposed(isPayment ? String(Math.round(suggestedAmount ?? currentAmount) || "") : "");
    setReason("");
    setEvidence(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="gap-1 text-xs">
            {isPayment ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> Confirmar pago completo
              </>
            ) : (
              <>
                <AlertTriangle className="h-3.5 w-3.5" /> Solicitar corrección
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isPayment ? "Confirmar pago completo" : "Solicitar corrección de valor"}
          </DialogTitle>
          <DialogDescription>
            {orderCode ? `Pedido ${orderCode}` : "Pedido"}
            {clientName ? ` · ${clientName}` : ""} · Valor del pedido $
            {Math.round(currentAmount).toLocaleString("es-CO")}.{" "}
            {isPayment
              ? "El valor del pedido no cambia: solo se registra el pago que falta en el historial. Contabilidad lo revisa y aprueba."
              : "Usa esta opción solo cuando el valor del pedido esté mal. Contabilidad revisará y aprobará el nuevo valor."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>{isPayment ? "Valor total pagado por el cliente" : "Valor correcto propuesto"}</Label>
            <Input
              type="number"
              min={1}
              value={proposed}
              onChange={(e) => setProposed(e.target.value)}
              placeholder={isPayment ? "Ej. 320000" : "Ej. 550000"}
            />
          </div>
          {looksLikePayment && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs">
              <p className="font-medium text-amber-700">¿El cliente ya pagó y el valor está bien?</p>
              <p className="text-muted-foreground mt-0.5">
                Entonces no cambies el valor del pedido: cierra esta ventana y usa
                “Confirmar pago completo”. Así se registra el pago sin alterar el total.
              </p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>{isPayment ? "Nota" : "Motivo"}</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isPayment
                  ? "Ej. El cliente pagó todo el saldo por transferencia el 5 de septiembre"
                  : "Explica por qué el valor registrado no corresponde"
              }
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Soporte {isPayment ? "del pago (recomendado)" : "(opcional)"}</Label>
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
