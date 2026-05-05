import { useState, useMemo, useRef } from "react";
import { CompletionDialog } from "./CompletionDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  CheckCircle2,
  Play,
  Paintbrush,
  Cylinder,
  CircleDot,
  Stamp,
  Scissors,
  Target,
  Truck,
  Info,
  ShieldCheck,
  Search,
} from "lucide-react";
import { useProductionOrders, type ProductionOrder } from "@/hooks/useProductionOrders";
import { useAuth } from "@/contexts/AuthContext";

const STAGE_ICONS: Record<string, React.ElementType> = {
  estampacion: Paintbrush,
  produccion_tubos: Cylinder,
  ensamble_cuello: CircleDot,
  sello_base: Stamp,
  refile: Scissors,
  colocacion_boquilla: Target,
  listo: Truck,
};

const SS_STAGE_LABELS: Record<string, string> = {
  estampacion: "Estampación",
  produccion_tubos: "Producción de tubos",
  ensamble_cuello: "Ensamble de cuello",
  sello_base: "Sello de base",
  refile: "Refile",
  colocacion_boquilla: "Colocación de boquilla",
  listo: "Listo",
};

const FULL_STAGE_ORDER = ["estampacion", "produccion_tubos", "ensamble_cuello", "sello_base", "refile", "colocacion_boquilla", "listo"];

const STATUS_BADGE: Record<string, { label: string; variant: "secondary" | "default" | "outline" }> = {
  pendiente: { label: "Pendiente", variant: "secondary" },
  en_proceso: { label: "En proceso", variant: "default" },
  finalizado: { label: "Finalizado", variant: "outline" },
};

export const SweatspotWorkflow = () => {
  const { orders, isLoading, updateStageStatus, advanceStage, forceCompleteOrder } = useProductionOrders("sweatspot");
  const { role } = useAuth();
  const [completionOrder, setCompletionOrder] = useState<ProductionOrder | null>(null);
  const isAdmin = role === "admin";
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [searchTerm, setSearchTerm] = useState("");
  const stageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const activeOrdersAll = orders.filter((o) => o.current_stage !== "listo");
  const completedOrders = orders.filter((o) => o.current_stage === "listo");
  const activeOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return activeOrdersAll;
    return activeOrdersAll.filter((o) =>
      (o.client_name || "").toLowerCase().includes(q) ||
      (o.advisor_name || "").toLowerCase().includes(q) ||
      (o.logo_file || "").toLowerCase().includes(q) ||
      (o.thermo_size || "").toLowerCase().includes(q) ||
      (o.observations || "").toLowerCase().includes(q)
    );
  }, [activeOrdersAll, searchTerm]);
  const stageCounts = useMemo(() => {
    const m: Record<string, number> = {};
    activeOrdersAll.forEach((o) => { m[o.current_stage] = (m[o.current_stage] || 0) + 1; });
    return m;
  }, [activeOrdersAll]);
  const scrollToStage = (stage: string) => {
    const el = stageRefs.current[stage];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkFinalize = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`¿Finalizar ${ids.length} pedido(s) y enviarlos a Logística?`)) return;
    for (const id of ids) {
      await forceCompleteOrder.mutateAsync({ orderId: id });
    }
    toast.success(`${ids.length} pedido(s) finalizado(s) y enviados a Logística.`);
    setSelected(new Set());
  };

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-foreground">Flujo de producción — Sweatspot</p>
            <p className="text-sm text-muted-foreground mt-1">
              Los pedidos provienen de <span className="font-medium">Ventas</span>. El flujo de etapas se determina automáticamente según el tipo de impresión y la disponibilidad de stock.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FULL_STAGE_ORDER.filter((s) => s !== "listo").map((stage) => {
          const Icon = STAGE_ICONS[stage];
          const count = stageCounts[stage] || 0;
          return (
            <button
              key={stage}
              type="button"
              onClick={() => scrollToStage(stage)}
              disabled={count === 0}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${count > 0 ? "bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer" : "bg-muted text-muted-foreground cursor-default opacity-60"}`}
            >
              <Icon className="h-3 w-3" />
              {SS_STAGE_LABELS[stage]}
              <Badge variant={count > 0 ? "default" : "secondary"} className="h-4 px-1.5 text-[10px]">{count}</Badge>
            </button>
          );
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente, asesor, logo o tamaño..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <Separator />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-foreground">Órdenes de producción ({activeOrders.length} activas)</h3>
        {isAdmin && selected.size > 0 && (
          <Button size="sm" onClick={handleBulkFinalize}>
            <ShieldCheck className="h-4 w-4 mr-1" /> Finalizar {selected.size} seleccionado(s)
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground -mt-4">Estas órdenes se crean automáticamente desde la sección de Ventas.</p>

      {activeOrders.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No hay órdenes activas. Las órdenes se generan desde Ventas.</p>
      )}

      <div className="space-y-6">
        {FULL_STAGE_ORDER.filter((s) => s !== "listo").map((stage) => {
          const stageOrders = activeOrders.filter((o) => o.current_stage === stage);
          if (stageOrders.length === 0) return null;
          const StageIcon = STAGE_ICONS[stage] || Paintbrush;
          return (
            <div key={stage} ref={(el) => { stageRefs.current[stage] = el; }} className="space-y-2 scroll-mt-4">
              <div className="flex items-center gap-2 border-b pb-1.5">
                <StageIcon className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">{SS_STAGE_LABELS[stage]}</h4>
                <Badge variant="secondary">{stageOrders.length}</Badge>
              </div>
              <div className="grid gap-4">
                {stageOrders.map((order) => {
                  const stages = order.stages;
                  const currentIdx = stages.indexOf(order.current_stage);
                  const lastActionableIdx = stages.length - 2;
                  const isLastStage = currentIdx >= lastActionableIdx;
                  return (
                    <OrderCard
                      key={order.id}
                      order={order}
                      role={role}
                      isAdmin={isAdmin}
                      selected={selected.has(order.id)}
                      onToggleSelect={() => toggleSelect(order.id)}
                      onStart={() => updateStageStatus.mutate({ orderId: order.id, status: "en_proceso" })}
                      onFinish={() => {
                        if (isLastStage) {
                          setCompletionOrder(order);
                        } else {
                          advanceStage.mutate({ orderId: order.id });
                        }
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {completedOrders.length > 0 && (
        <>
          <Separator />
          <h3 className="text-sm font-semibold text-foreground">Órdenes completadas ({completedOrders.length})</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {completedOrders.map((order) => (
              <Card key={order.id} className="border opacity-75">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{order.client_name}</p>
                      <p className="text-xs text-muted-foreground">Termo {order.thermo_size} — {order.quantity} uds</p>
                      <p className="text-xs text-muted-foreground">Asesor: {order.advisor_name || "—"}</p>
                    </div>
                    <Badge variant="outline" className="text-primary border-primary/30">
                      <Truck className="h-3 w-3 mr-1" /> Enviado a Logística
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <CompletionDialog
        open={!!completionOrder}
        onClose={() => setCompletionOrder(null)}
        order={completionOrder}
        onConfirm={(data) => {
          if (!completionOrder) return;
          advanceStage.mutate({
            orderId: completionOrder.id,
            completionData: data,
          });
          setCompletionOrder(null);
        }}
      />
    </div>
  );
};

/* Order Card */
function OrderCard({ order, role, isAdmin, selected, onToggleSelect, onStart, onFinish }: { order: ProductionOrder; role: string | null; isAdmin: boolean; selected: boolean; onToggleSelect: () => void; onStart: () => void; onFinish: () => void }) {
  const stages = order.stages;
  const currentIdx = stages.indexOf(order.current_stage);
  const Icon = STAGE_ICONS[order.current_stage] || Paintbrush;
  const badge = STATUS_BADGE[order.stage_status] || STATUS_BADGE.pendiente;
  const isEstampacionStage = order.current_stage === "estampacion";
  const disableButtons = isEstampacionStage && role === "produccion";

  return (
    <Card className={selected ? "ring-2 ring-primary" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Checkbox checked={selected} onCheckedChange={onToggleSelect} aria-label="Seleccionar pedido" />
            )}
            <div className="rounded-lg bg-primary/10 p-2">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{order.client_name}</CardTitle>
              <p className="text-xs text-muted-foreground">Termo {order.thermo_size} — {order.quantity} uds</p>
              <p className="text-xs text-muted-foreground">Asesor: {order.advisor_name || "—"}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={badge.variant}>{badge.label}</Badge>
            <Badge variant="outline" className="text-xs">
              {order.workflow_type === "short" ? "Flujo corto" : "Flujo completo"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-1">
          {stages.map((stage, idx) => {
            const isCurrent = stage === order.current_stage;
            const isDone = idx < currentIdx || order.current_stage === "listo";
            return (
              <div key={stage} className="flex-1">
                <div className={`h-2 rounded-full transition-colors ${isDone ? "bg-primary" : isCurrent ? "bg-primary/40" : "bg-muted"}`} title={SS_STAGE_LABELS[stage] || stage} />
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto">
          {stages.map((stage, idx) => {
            const isCurrent = stage === order.current_stage;
            const isDone = idx < currentIdx || order.current_stage === "listo";
            const StageIcon = STAGE_ICONS[stage] || Paintbrush;
            return (
              <div key={stage} className={`flex-1 flex flex-col items-center text-center ${isCurrent ? "text-primary font-medium" : isDone ? "text-primary/60" : "text-muted-foreground"}`}>
                <StageIcon className={`h-3.5 w-3.5 mb-0.5 ${isDone ? "text-primary" : ""}`} />
                <span className="text-[10px] leading-tight">{SS_STAGE_LABELS[stage] || stage}</span>
              </div>
            );
          })}
        </div>

        <Separator />

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Etapa actual: <span className="font-medium text-foreground">{SS_STAGE_LABELS[order.current_stage] || order.current_stage}</span>
          </span>
          <span className="text-xs text-muted-foreground">Creado: {new Date(order.created_at).toLocaleDateString()}</span>
        </div>

        <div className="rounded-md border p-3 text-xs space-y-1">
          {order.delivery_date && (
            <Row label="Fecha de entrega" value={new Date(order.delivery_date).toLocaleDateString()} />
          )}
          <Row label="Tipo de logo" value={order.logo_type === "impresion_full" ? "Impresión full" : "Impresión básica"} />
          <Row label="Stock disponible" value={order.has_stock ? "Sí" : "No"} />
          <Row label="Tamaño" value={order.thermo_size || "-"} />
          <Row label="Color de silicona" value={order.silicone_color || "-"} />
          <Row label="Color de tinta" value={order.ink_color || "-"} />
          {order.logo_file && <Row label="Logo" value={order.logo_file} />}
        </div>

        {order.observations && <p className="text-xs text-muted-foreground italic">Obs: {order.observations}</p>}

        {order.current_stage !== "listo" && (
          <div className="flex gap-2 pt-1">
            {order.stage_status === "pendiente" && (
              <Button size="sm" variant="outline" onClick={onStart} disabled={disableButtons}>
                <Play className="h-3 w-3 mr-1" /> Iniciar proceso
              </Button>
            )}
            {order.stage_status === "en_proceso" && (
              <Button size="sm" onClick={onFinish} disabled={disableButtons}>
                <CheckCircle2 className="h-3 w-3 mr-1" /> Finalizar proceso
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span>{" "}
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
