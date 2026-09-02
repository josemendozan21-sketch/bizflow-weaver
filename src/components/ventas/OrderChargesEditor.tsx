import { useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrderCharges, useAddOrderCharge, useDeleteOrderCharge } from "@/hooks/useOrderCharges";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  orderId: string;
  disabled?: boolean;
  onChanged?: () => void;
}

export function OrderChargesEditor({ orderId, disabled, onChanged }: Props) {
  const { user } = useAuth();
  const { data: charges = [], isLoading } = useOrderCharges(orderId);
  const addCharge = useAddOrderCharge();
  const deleteCharge = useDeleteOrderCharge();

  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState<number>(0);

  const total = charges.reduce((s, c) => s + (Number(c.amount) || 0), 0);

  const handleAdd = async () => {
    if (!concept.trim() || !amount) return;
    await addCharge.mutateAsync({
      order_id: orderId,
      concept: concept.trim(),
      amount: Number(amount),
      created_by: user?.id ?? null,
      created_by_name: (user?.user_metadata as any)?.display_name || user?.email || null,
    });
    setConcept("");
    setAmount(0);
    onChanged?.();
  };

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm">Cargos adicionales</Label>
        <span className="text-sm font-medium">${total.toLocaleString("es-CO")}</span>
      </div>

      {isLoading && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Cargando…
        </p>
      )}

      {charges.map((c) => (
        <div key={c.id} className="flex items-center justify-between gap-2 text-sm border-b last:border-0 py-1">
          <div className="min-w-0">
            <p className="truncate">{c.concept}</p>
            {c.created_by_name && (
              <p className="text-[11px] text-muted-foreground truncate">Agregado por {c.created_by_name}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span>${Number(c.amount).toLocaleString("es-CO")}</span>
            {!disabled && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive"
                onClick={async () => {
                  await deleteCharge.mutateAsync({ id: c.id, order_id: orderId });
                  onChanged?.();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      ))}

      {!disabled && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Input
            className="flex-1 min-w-[140px]"
            placeholder="Concepto (ej. marcación adicional)"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
          />
          <Input
            className="w-28"
            type="number"
            min={0}
            placeholder="Valor"
            value={amount || ""}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
          />
          <Button type="button" size="sm" onClick={handleAdd} disabled={!concept.trim() || !amount || addCharge.isPending}>
            <Plus className="h-4 w-4 mr-1" /> Agregar
          </Button>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        Los cargos adicionales se suman al total del pedido y quedan registrados en el historial.
      </p>
    </div>
  );
}

export default OrderChargesEditor;
