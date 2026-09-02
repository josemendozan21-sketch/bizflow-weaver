import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { PackagePlus, Undo2 } from "lucide-react";
import { toast } from "sonner";
import OrderCodeBadge from "@/components/common/OrderCodeBadge";
import { useProductionBatches, type ProductionBatch } from "@/hooks/useProductionBatches";

const brandLabel = (b: string) =>
  /sweat/i.test(b) ? "Sweatspot" : /magical/i.test(b) ? "Magical Warmers" : b;

export default function BatchReceptionPanel() {
  const { batches, itemsOf, isLoading, receiveBatch, revertReception } = useProductionBatches();
  const [target, setTarget] = useState<ProductionBatch | null>(null);
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState(false);
  const [returnTarget, setReturnTarget] = useState<ProductionBatch | null>(null);
  const [returnReason, setReturnReason] = useState("");


  const pending = useMemo(() => batches.filter((b) => b.status === "finalizado"), [batches]);
  const recent = useMemo(
    () => batches.filter((b) => b.status === "recibido").slice(0, 15),
    [batches],
  );

  const doReceive = async () => {
    if (!target) return;
    setBusy(true);
    const res = await receiveBatch(target.id, Number(qty || 0));
    setBusy(false);
    if (res.success) {
      toast.success("Recepción confirmada. Inventario actualizado.");
      setTarget(null);
    } else {
      toast.error(res.message);
    }
  };

  const doRevert = async () => {
    if (!returnTarget) return;
    if (!returnReason.trim()) {
      toast.error("Indica el motivo de la devolución");
      return;
    }
    setBusy(true);
    const res = await revertReception(returnTarget.id, returnReason.trim());
    setBusy(false);
    if (res.success) {
      toast.success("Lote devuelto a producción. Stock revertido.");
      setReturnTarget(null);
      setReturnReason("");
    } else {
      toast.error(res.message);
    }
  };


  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <PackagePlus className="h-4 w-4" /> Recepción de producción
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Doble verificación: producción declara lo fabricado e inventario confirma la recepción. El stock solo se suma
          cuando inventario confirma.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay lotes pendientes de recepción.</p>
        ) : (
          <div className="space-y-2">
            {pending.map((b) => (
              <div key={b.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[11px]">Lote #{b.batch_number}</Badge>
                  <span className="font-medium">{b.item_name}</span>
                  {b.product_type && (
                    <Badge variant="outline" className="text-[11px]">
                      {/fr[ií]o/i.test(b.product_type) ? "❄️ Frío" : "🔥 Térmico"}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-[11px]">{brandLabel(b.brand)}</Badge>
                  <span className="ml-auto text-sm">
                    Objetivo {Number(b.target_quantity)} · Producidas <strong>{Number(b.produced_quantity ?? 0)}</strong>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {itemsOf(b.id).map((o) => (
                    <span key={o.id} className="flex items-center gap-1 rounded bg-muted px-2 py-0.5">
                      <OrderCodeBadge code={o.order_code} compact /> {Number(o.quantity)} uds
                    </span>
                  ))}
                  <Button
                    size="sm"
                    className="ml-auto"
                    onClick={() => {
                      setTarget(b);
                      setQty(String(Number(b.produced_quantity ?? 0)));
                    }}
                  >
                    Confirmar recepción
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {recent.length > 0 && (
          <div className="space-y-1 pt-2">
            <p className="text-xs font-medium text-muted-foreground">Últimas recepciones</p>
            {recent.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="font-mono text-[10px]">#{b.batch_number}</Badge>
                <span>{b.item_name}</span>
                <span>· {Number(b.received_quantity ?? 0)} uds</span>
                <span>· {b.received_at ? new Date(b.received_at).toLocaleString("es-CO") : ""}</span>
                <span>· {b.received_by_name}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar recepción — lote #{target?.batch_number}</DialogTitle>
            <DialogDescription>
              Verifica físicamente las unidades recibidas de "{target?.item_name}". Al confirmar se suman al inventario.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Unidades recibidas</Label>
            <Input type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Declaradas por producción: {Number(target?.produced_quantity ?? 0)}
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)}>Cancelar</Button>
            <Button onClick={doReceive} disabled={busy}>{busy ? "Confirmando…" : "Confirmar recepción"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
