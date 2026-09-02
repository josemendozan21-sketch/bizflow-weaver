import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Trash2, PackageCheck } from "lucide-react";
import { useOrderDeliveries } from "@/hooks/useOrderDeliveries";
import OrderCodeBadge from "@/components/common/OrderCodeBadge";

interface PartialDeliveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderCode?: string | null;
  clientName?: string | null;
  product?: string | null;
  quantity: number;
}

export default function PartialDeliveryDialog({
  open,
  onOpenChange,
  orderId,
  orderCode,
  clientName,
  product,
  quantity,
}: PartialDeliveryDialogProps) {
  const { deliveries, addDelivery, deleteDelivery, totalDelivered, canManage, canDelete } =
    useOrderDeliveries(open ? orderId : null);

  const [qty, setQty] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const pending = Math.max(quantity - totalDelivered, 0);
  const pct = quantity > 0 ? Math.min((totalDelivered / quantity) * 100, 100) : 0;
  const parsed = parseInt(qty, 10);
  const valid = Number.isFinite(parsed) && parsed > 0 && parsed <= pending;

  const handleSubmit = async () => {
    if (!valid) return;
    await addDelivery.mutateAsync({ order_id: orderId, quantity: parsed, delivered_at: date, notes });
    setQty("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-4 w-4" /> Entregas parciales
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            <OrderCodeBadge code={orderCode} compact />
            <span>
              {clientName} · {product}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">
                {totalDelivered.toLocaleString("es-CO")} / {quantity.toLocaleString("es-CO")} uds entregadas
              </span>
              <span className="text-muted-foreground">
                Faltan {pending.toLocaleString("es-CO")}
              </span>
            </div>
            <Progress value={pct} />
          </div>

          {canManage && pending > 0 && (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="pd-qty">Cantidad entregada</Label>
                  <Input
                    id="pd-qty"
                    type="number"
                    min={1}
                    max={pending}
                    value={qty}
                    placeholder={`Máx. ${pending}`}
                    onChange={(e) => setQty(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pd-date">Fecha de entrega</Label>
                  <Input id="pd-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="pd-notes">Nota (opcional)</Label>
                <Textarea
                  id="pd-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Entrega en sede norte, recibe Juan"
                />
              </div>
              <Button className="w-full" disabled={!valid || addDelivery.isPending} onClick={handleSubmit}>
                Registrar entrega
              </Button>
              {qty && !valid && (
                <p className="text-xs text-destructive">
                  Ingresa una cantidad entre 1 y {pending.toLocaleString("es-CO")}.
                </p>
              )}
            </div>
          )}

          {pending === 0 && (
            <p className="text-sm text-emerald-600">Este pedido ya fue entregado en su totalidad.</p>
          )}
          {!canManage && (
            <p className="text-xs text-muted-foreground">
              Solo Inventarios, Logística, Producción o Administración pueden registrar entregas.
            </p>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Historial de entregas</p>
            {deliveries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay entregas registradas.</p>
            ) : (
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {deliveries.map((d) => (
                  <div key={d.id} className="flex items-start justify-between rounded-md border p-2 text-sm">
                    <div>
                      <p className="font-medium">
                        {Number(d.quantity).toLocaleString("es-CO")} uds · {d.delivered_at}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {d.delivered_by_name || "—"}
                        {d.notes ? ` · ${d.notes}` : ""}
                      </p>
                    </div>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteDelivery.mutate(d.id)}
                        disabled={deleteDelivery.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
