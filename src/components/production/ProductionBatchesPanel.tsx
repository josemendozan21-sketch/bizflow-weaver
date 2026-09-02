import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Factory, Play, CheckCircle2, Search } from "lucide-react";
import { toast } from "sonner";
import OrderCodeBadge from "@/components/common/OrderCodeBadge";
import { useProductionBatches, type ProductionBatch, type BatchStatus } from "@/hooks/useProductionBatches";

const normalize = (s: string) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const brandLabel = (b: string) =>
  /sweat/i.test(b) ? "Sweatspot" : /magical/i.test(b) ? "Magical Warmers" : b;

const STATUS_LABEL: Record<BatchStatus, string> = {
  abierto: "Abierto (acumulando)",
  en_proceso: "En proceso",
  finalizado: "Esperando recepción",
  recibido: "Recibido en inventario",
};

const statusVariant = (s: BatchStatus) =>
  s === "abierto" ? "secondary" : s === "en_proceso" ? "default" : s === "finalizado" ? "outline" : "outline";

interface Props {
  /** Cuando es true muestra solo lectura (sin acciones de producción) */
  readOnly?: boolean;
}

export default function ProductionBatchesPanel({ readOnly = false }: Props) {
  const { batches, itemsOf, isLoading, startBatch, finishBatch } = useProductionBatches();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BatchStatus | "todos">("todos");
  const [finishTarget, setFinishTarget] = useState<ProductionBatch | null>(null);
  const [produced, setProduced] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = normalize(search);
    return batches
      .filter((b) => status === "todos" || b.status === status)
      .filter(
        (b) =>
          !q ||
          normalize(b.item_name).includes(q) ||
          normalize(b.brand).includes(q) ||
          String(b.batch_number).includes(q),
      );
  }, [batches, status, search]);

  const doStart = async (b: ProductionBatch) => {
    setBusy(true);
    const res = await startBatch(b.id);
    setBusy(false);
    res.success ? toast.success(res.message) : toast.error(res.message);
  };

  const doFinish = async () => {
    if (!finishTarget) return;
    setBusy(true);
    const res = await finishBatch(finishTarget.id, Number(produced || 0));
    setBusy(false);
    if (res.success) {
      toast.success("Lote finalizado. Inventario debe confirmar la recepción.");
      setFinishTarget(null);
    } else {
      toast.error(res.message);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Factory className="h-4 w-4" /> Lotes de producción
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Los faltantes de varias órdenes de la misma referencia se acumulan en un lote abierto. Al iniciar, el lote se
          cierra y lo que entre después crea uno nuevo.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {(["todos", "abierto", "en_proceso", "finalizado", "recibido"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={status === s ? "default" : "outline"}
              onClick={() => setStatus(s)}
            >
              {s === "todos" ? "Todos" : STATUS_LABEL[s]}
            </Button>
          ))}
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Referencia, marca o # lote…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando lotes…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay lotes en esta vista.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((b) => {
              const orders = itemsOf(b.id);
              return (
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
                    <Badge variant={statusVariant(b.status) as any} className="text-[11px]">
                      {STATUS_LABEL[b.status]}
                    </Badge>
                    <span className="ml-auto text-sm">
                      Objetivo: <strong>{Number(b.target_quantity)}</strong>
                      {b.produced_quantity != null && <> · Producidas: <strong>{Number(b.produced_quantity)}</strong></>}
                      {b.received_quantity != null && <> · Recibidas: <strong>{Number(b.received_quantity)}</strong></>}
                    </span>
                  </div>

                  {orders.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {orders.map((o) => (
                        <span key={o.id} className="flex items-center gap-1 rounded bg-muted px-2 py-0.5">
                          <OrderCodeBadge code={o.order_code} compact />
                          {o.client_name ? `${o.client_name} · ` : ""}
                          {Number(o.quantity)} uds
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>Creado: {new Date(b.created_at).toLocaleString("es-CO")}</span>
                    {b.started_at && <span>Iniciado: {new Date(b.started_at).toLocaleString("es-CO")} · {b.started_by_name}</span>}
                    {b.finished_at && <span>Finalizado: {new Date(b.finished_at).toLocaleString("es-CO")} · {b.finished_by_name}</span>}
                    {b.received_at && <span>Recibido: {new Date(b.received_at).toLocaleString("es-CO")} · {b.received_by_name}</span>}

                    {!readOnly && b.status === "abierto" && (
                      <Button size="sm" className="ml-auto gap-1" disabled={busy} onClick={() => doStart(b)}>
                        <Play className="h-3.5 w-3.5" /> Iniciar producción
                      </Button>
                    )}
                    {!readOnly && b.status === "en_proceso" && (
                      <Button
                        size="sm"
                        className="ml-auto gap-1"
                        onClick={() => {
                          setFinishTarget(b);
                          setProduced(String(Number(b.target_quantity)));
                        }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Finalizar y declarar unidades
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={!!finishTarget} onOpenChange={(o) => !o && setFinishTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar lote #{finishTarget?.batch_number}</DialogTitle>
            <DialogDescription>
              Declara las unidades realmente producidas de "{finishTarget?.item_name}". Inventario deberá confirmar la
              recepción para que se sumen al stock.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Unidades producidas</Label>
            <Input type="number" min={0} value={produced} onChange={(e) => setProduced(e.target.value)} />
            <p className="text-xs text-muted-foreground">Objetivo del lote: {Number(finishTarget?.target_quantity ?? 0)}</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFinishTarget(null)}>Cancelar</Button>
            <Button onClick={doFinish} disabled={busy}>{busy ? "Guardando…" : "Finalizar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
