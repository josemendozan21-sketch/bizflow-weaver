import { useState } from "react";
import { CompletionDialog } from "./CompletionDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Plus,
  Play,
  Package,
  Paintbrush,
  Droplets,
  Stamp,
  Scissors,
  BoxSelect,
  Truck,
  Info,
  Thermometer,
  Snowflake,
} from "lucide-react";
import { toast } from "sonner";
import { useProductionOrders, type ProductionOrder, type BodyTask } from "@/hooks/useProductionOrders";
import { useAuth } from "@/contexts/AuthContext";

type MagicalStage = "produccion_cuerpos" | "estampacion" | "dosificacion" | "sellado" | "recorte" | "empaque" | "listo";

const STAGE_ORDER: MagicalStage[] = [
  "produccion_cuerpos", "estampacion", "dosificacion", "sellado", "recorte", "empaque", "listo",
];

const STAGE_LABELS: Record<string, string> = {
  produccion_cuerpos: "Producción de Cuerpos",
  estampacion: "Estampación",
  dosificacion: "Dosificación",
  sellado: "Sellado",
  recorte: "Recorte",
  empaque: "Empaque",
  listo: "Listo",
};

const STAGE_ICONS: Record<string, React.ElementType> = {
  produccion_cuerpos: Package,
  estampacion: Paintbrush,
  dosificacion: Droplets,
  sellado: Stamp,
  recorte: Scissors,
  empaque: BoxSelect,
  listo: Truck,
};

const STATUS_BADGE: Record<string, { label: string; variant: "secondary" | "default" | "outline" }> = {
  pendiente: { label: "Pendiente", variant: "secondary" },
  en_proceso: { label: "En proceso", variant: "default" },
  finalizado: { label: "Finalizado", variant: "outline" },
};

const PLASTICO_OPTIONS = [
  { value: "frio", label: "Frío", icon: Snowflake },
  { value: "calor", label: "Calor", icon: Thermometer },
];

/** Canonical product references for body production */
const CANONICAL_REFERENCES = [
  "Lumbar", "Shoulder", "Cervical", "Multiusos", "Pocket", "Handy",
  "Muela", "Círculo 8 cm", "Círculo 12 cm",
];

export const MagicalWarmersWorkflow = () => {
  const { orders, bodyTasks, isLoading, updateStageStatus, advanceStage, addBodyTask, updateBodyTaskStatus } = useProductionOrders("magical");
  const { role } = useAuth();
  const [showBodyForm, setShowBodyForm] = useState(false);

  // Confirmation dialog state for body tasks
  const [confirmTask, setConfirmTask] = useState<BodyTask | null>(null);
  const [confirmQty, setConfirmQty] = useState("");

  // Confirmation dialog state for production orders in produccion_cuerpos stage
  const [confirmOrder, setConfirmOrder] = useState<ProductionOrder | null>(null);
  const [confirmOrderQty, setConfirmOrderQty] = useState("");

  // Completion dialog state for finishing empaque (last stage before listo)
  const [completionOrder, setCompletionOrder] = useState<ProductionOrder | null>(null);

  const activeOrders = orders.filter((o) => o.current_stage !== "listo");
  const completedOrders = orders.filter((o) => o.current_stage === "listo");
  const activeBodyTasks = bodyTasks.filter((t) => t.status !== "finalizado");
  const completedBodyTasks = bodyTasks.filter((t) => t.status === "finalizado");

  const handleFinishBodyTask = (task: BodyTask) => {
    setConfirmTask(task);
    setConfirmQty(String(task.unidades));
  };

  const handleConfirmBodyTask = () => {
    if (!confirmTask) return;
    const qty = parseInt(confirmQty, 10);
    if (!qty || qty <= 0) {
      toast.error("Ingrese una cantidad válida.");
      return;
    }
    updateBodyTaskStatus.mutate({ taskId: confirmTask.id, status: "finalizado", actualQuantity: qty });
    toast.success(`Producción de cuerpos finalizada. ${qty} unidades agregadas al inventario.`);
    setConfirmTask(null);
  };

  const handleFinishOrder = (order: ProductionOrder) => {
    if (order.current_stage === "produccion_cuerpos") {
      setConfirmOrder(order);
      setConfirmOrderQty(String(order.quantity));
    } else {
      advanceStage.mutate({ orderId: order.id });
    }
  };

  const handleConfirmOrderAdvance = () => {
    if (!confirmOrder) return;
    const qty = parseInt(confirmOrderQty, 10);
    if (!qty || qty <= 0) {
      toast.error("Ingrese una cantidad válida.");
      return;
    }
    advanceStage.mutate({ orderId: confirmOrder.id, confirmedQuantity: qty });
    setConfirmOrder(null);
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
            <p className="font-semibold text-foreground">Flujo de producción — Magical Warmers</p>
            <p className="text-sm text-muted-foreground mt-1">
              Los pedidos de producción provienen de <span className="font-medium">Ventas</span>. Aquí puedes registrar la producción de cuerpos y dar seguimiento a cada etapa del proceso.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STAGE_ORDER.map((stage) => {
          const Icon = STAGE_ICONS[stage];
          return (
            <div key={stage} className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <Icon className="h-3 w-3" />
              {STAGE_LABELS[stage]}
            </div>
          );
        })}
      </div>

      {/* Body Production */}
      <Separator />
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Producción de cuerpos ({activeBodyTasks.length} activas)</h3>
        <Button size="sm" onClick={() => setShowBodyForm(true)} disabled={showBodyForm}>
          <Plus className="h-4 w-4 mr-1" /> Producción de cuerpos
        </Button>
      </div>

      {showBodyForm && (
        <BodyProductionForm
          onClose={() => setShowBodyForm(false)}
          onSubmit={(data) => {
            addBodyTask.mutate({ tipo_plastico: data.tipoPlastico, referencia: data.referencia, unidades: data.unidades });
            setShowBodyForm(false);
          }}
        />
      )}

      {activeBodyTasks.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {activeBodyTasks.map((task) => {
            const badge = STATUS_BADGE[task.status] || STATUS_BADGE.pendiente;
            return (
              <Card key={task.id}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">
                        {task.tipo_plastico === "frio" ? "Frío" : "Calor"} — {task.referencia}
                      </span>
                    </div>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                  <div className="text-sm space-y-1">
                    <Row label="Tipo de plástico" value={task.tipo_plastico === "frio" ? "Frío" : "Calor"} />
                    <Row label="Referencia" value={task.referencia} />
                    <Row label="Unidades estimadas" value={`${task.unidades}`} />
                    <Row label="Fecha" value={new Date(task.created_at).toLocaleDateString()} />
                  </div>
                  <div className="flex gap-2 pt-1">
                    {task.status === "pendiente" && (
                      <Button size="sm" variant="outline" onClick={() => { updateBodyTaskStatus.mutate({ taskId: task.id, status: "en_proceso" }); toast.info("Producción de cuerpos iniciada."); }}>
                        <Play className="h-3 w-3 mr-1" /> Iniciar proceso
                      </Button>
                    )}
                    {task.status === "en_proceso" && (
                      <Button size="sm" onClick={() => handleFinishBodyTask(task)}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Finalizar proceso
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {completedBodyTasks.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Ver cuerpos completados ({completedBodyTasks.length})
          </summary>
          <div className="grid gap-2 md:grid-cols-2 mt-2">
            {completedBodyTasks.map((task) => (
              <Card key={task.id} className="border opacity-70">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{task.tipo_plastico === "frio" ? "Frío" : "Calor"} — {task.referencia} ({task.unidades} uds)</span>
                    <Badge variant="outline">Finalizado</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </details>
      )}

      {/* Production Orders */}
      <Separator />
      <h3 className="text-sm font-semibold text-foreground">Órdenes de producción ({activeOrders.length} activas)</h3>
      <p className="text-xs text-muted-foreground -mt-4">Estas órdenes se crean automáticamente desde la sección de Ventas.</p>

      {activeOrders.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No hay órdenes activas. Las órdenes se generan desde Ventas.</p>
      )}

      <div className="grid gap-4">
        {activeOrders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            role={role}
            onStart={() => updateStageStatus.mutate({ orderId: order.id, status: "en_proceso" })}
            onFinish={() => handleFinishOrder(order)}
          />
        ))}
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
                      <p className="text-xs text-muted-foreground">{order.molde || order.thermo_size} — {order.quantity} uds</p>
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

      {/* Confirmation Dialog - Body Task */}
      <Dialog open={!!confirmTask} onOpenChange={(open) => { if (!open) setConfirmTask(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar cantidad producida</DialogTitle>
            <DialogDescription>
              Confirme la cantidad real de cuerpos producidos antes de actualizar el inventario.
            </DialogDescription>
          </DialogHeader>
          {confirmTask && (
            <div className="space-y-4">
              <div className="rounded-md border p-3 text-sm space-y-1">
                <Row label="Referencia" value={confirmTask.referencia} />
                <Row label="Tipo" value={confirmTask.tipo_plastico === "frio" ? "Frío" : "Calor"} />
                <Row label="Cantidad estimada" value={`${confirmTask.unidades} unidades`} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-qty">Cantidad real producida *</Label>
                <Input
                  id="confirm-qty"
                  type="number"
                  min="1"
                  value={confirmQty}
                  onChange={(e) => setConfirmQty(e.target.value)}
                  placeholder="Ingrese la cantidad real"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTask(null)}>Cancelar</Button>
            <Button onClick={handleConfirmBodyTask}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar y finalizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog - Production Order (produccion_cuerpos stage) */}
      <Dialog open={!!confirmOrder} onOpenChange={(open) => { if (!open) setConfirmOrder(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar cantidad producida</DialogTitle>
            <DialogDescription>
              Confirme la cantidad real de cuerpos producidos para la orden de {confirmOrder?.client_name}.
            </DialogDescription>
          </DialogHeader>
          {confirmOrder && (
            <div className="space-y-4">
              <div className="rounded-md border p-3 text-sm space-y-1">
                <Row label="Cliente" value={confirmOrder.client_name} />
                <Row label="Molde" value={confirmOrder.molde || "-"} />
                <Row label="Cantidad estimada" value={`${confirmOrder.quantity} unidades`} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-order-qty">Cantidad real producida *</Label>
                <Input
                  id="confirm-order-qty"
                  type="number"
                  min="1"
                  value={confirmOrderQty}
                  onChange={(e) => setConfirmOrderQty(e.target.value)}
                  placeholder="Ingrese la cantidad real"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOrder(null)}>Cancelar</Button>
            <Button onClick={handleConfirmOrderAdvance}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar y avanzar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* Order Card */
function OrderCard({ order, role, onStart, onFinish }: { order: ProductionOrder; role: string | null; onStart: () => void; onFinish: () => void }) {
  const stages = order.stages;
  const currentIdx = stages.indexOf(order.current_stage);
  const Icon = STAGE_ICONS[order.current_stage] || Package;
  const badge = STATUS_BADGE[order.stage_status] || STATUS_BADGE.pendiente;
  const isEstampacionStage = order.current_stage === "estampacion";
  const disableButtons = isEstampacionStage && role === "produccion";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{order.client_name}</CardTitle>
              <p className="text-xs text-muted-foreground">{order.molde} — {order.quantity} uds</p>
            </div>
          </div>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-1">
          {stages.filter((s) => order.needs_cuerpos || s !== "produccion_cuerpos").map((stage) => {
            const stageIdx = stages.indexOf(stage);
            const isCurrent = stage === order.current_stage;
            const isDone = stageIdx < currentIdx || order.current_stage === "listo";
            return (
              <div key={stage} className="flex items-center gap-1 flex-1">
                <div
                  className={`h-2 flex-1 rounded-full transition-colors ${isDone ? "bg-primary" : isCurrent ? "bg-primary/40" : "bg-muted"}`}
                  title={STAGE_LABELS[stage] || stage}
                />
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto">
          {stages.filter((s) => order.needs_cuerpos || s !== "produccion_cuerpos").map((stage) => {
            const stageIdx = stages.indexOf(stage);
            const isCurrent = stage === order.current_stage;
            const isDone = stageIdx < currentIdx || order.current_stage === "listo";
            const StageIcon = STAGE_ICONS[stage] || Package;
            return (
              <div key={stage} className={`flex-1 flex flex-col items-center text-center ${isCurrent ? "text-primary font-medium" : isDone ? "text-primary/60" : "text-muted-foreground"}`}>
                <StageIcon className={`h-3.5 w-3.5 mb-0.5 ${isDone ? "text-primary" : ""}`} />
                <span className="text-[10px] leading-tight">{STAGE_LABELS[stage] || stage}</span>
              </div>
            );
          })}
        </div>

        <Separator />

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Etapa actual: <span className="font-medium text-foreground">{STAGE_LABELS[order.current_stage] || order.current_stage}</span>
          </span>
          <span className="text-xs text-muted-foreground">Creado: {new Date(order.created_at).toLocaleDateString()}</span>
        </div>

        {order.current_stage === "estampacion" && (
          <div className="rounded-md border p-3 text-xs space-y-1">
            <Row label="Color de gel" value={order.gel_color || "-"} />
            <Row label="Color de tinta" value={order.ink_color || "-"} />
            <Row label="Molde / Referencia" value={order.molde || "-"} />
            {order.logo_file && <Row label="Logo" value={order.logo_file} />}
          </div>
        )}

        {order.observations && <p className="text-xs text-muted-foreground italic">Obs: {order.observations}</p>}

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
      </CardContent>
    </Card>
  );
}

/* Body Production Form */
function BodyProductionForm({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: { tipoPlastico: string; referencia: string; unidades: number }) => void }) {
  const [tipoPlastico, setTipoPlastico] = useState<string | null>(null);
  const [referencia, setReferencia] = useState("");
  const [unidades, setUnidades] = useState("");
  const canSubmit = tipoPlastico && referencia && unidades && parseInt(unidades) > 0;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Nueva producción de cuerpos</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Tipo de plástico *</Label>
          <div className="grid grid-cols-2 gap-3">
            {PLASTICO_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = tipoPlastico === opt.value;
              return (
                <button key={opt.value} type="button" onClick={() => setTipoPlastico(opt.value)}
                  className={`flex items-center gap-3 rounded-lg border-2 p-4 transition-colors cursor-pointer ${selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-primary/5"}`}>
                  <Icon className={`h-5 w-5 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`font-medium ${selected ? "text-foreground" : "text-muted-foreground"}`}>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Referencia *</Label>
            <Select value={referencia} onValueChange={setReferencia}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar referencia" />
              </SelectTrigger>
              <SelectContent>
                {CANONICAL_REFERENCES.map((ref) => (
                  <SelectItem key={ref} value={ref}>{ref}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Unidades a producir *</Label>
            <Input type="number" min="1" placeholder="Ej: 200" value={unidades} onChange={(e) => setUnidades(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { if (canSubmit && tipoPlastico) onSubmit({ tipoPlastico, referencia, unidades: parseInt(unidades) }); }} disabled={!canSubmit}>
            <Plus className="h-4 w-4 mr-1" /> Crear tarea
          </Button>
        </div>
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