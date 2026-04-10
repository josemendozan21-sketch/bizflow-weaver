import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Plus,
  ArrowRight,
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
import { useMagicalProductionStore } from "@/stores/magicalProductionStore";
import {
  STAGE_ORDER,
  STAGE_LABELS,
  type MagicalProductionStage,
  type StageStatus,
  type PlasticoTipo,
} from "@/types/magicalProduction";

const STAGE_ICONS: Record<MagicalProductionStage, React.ElementType> = {
  produccion_cuerpos: Package,
  estampacion: Paintbrush,
  dosificacion: Droplets,
  sellado: Stamp,
  recorte: Scissors,
  empaque: BoxSelect,
  listo: Truck,
};

const STATUS_BADGE: Record<StageStatus, { label: string; variant: "secondary" | "default" | "outline" }> = {
  pendiente: { label: "Pendiente", variant: "secondary" },
  en_proceso: { label: "En proceso", variant: "default" },
  finalizado: { label: "Finalizado", variant: "outline" },
};

const PLASTICO_OPTIONS: { value: PlasticoTipo; label: string; icon: React.ElementType }[] = [
  { value: "frio", label: "Frío", icon: Snowflake },
  { value: "calor", label: "Calor", icon: Thermometer },
];

export const MagicalWarmersWorkflow = () => {
  const { orders, bodyTasks, addBodyTask, updateBodyTaskStatus, updateStageStatus, advanceStage } = useMagicalProductionStore();
  const [showBodyForm, setShowBodyForm] = useState(false);

  const activeOrders = orders.filter((o) => o.currentStage !== "listo");
  const completedOrders = orders.filter((o) => o.currentStage === "listo");
  const activeBodyTasks = bodyTasks.filter((t) => t.status !== "finalizado");
  const completedBodyTasks = bodyTasks.filter((t) => t.status === "finalizado");

  return (
    <div className="space-y-6">
      {/* Instructions */}
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

      {/* Stage legend */}
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

      {/* ─── Body Production Section ─── */}
      <Separator />
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Producción de cuerpos ({activeBodyTasks.length} activas)
        </h3>
        <Button size="sm" onClick={() => setShowBodyForm(true)} disabled={showBodyForm}>
          <Plus className="h-4 w-4 mr-1" /> Producción de cuerpos
        </Button>
      </div>

      {showBodyForm && (
        <BodyProductionForm
          onClose={() => setShowBodyForm(false)}
          onSubmit={(data) => {
            addBodyTask(data);
            setShowBodyForm(false);
            toast.success("Tarea de producción de cuerpos creada.");
          }}
        />
      )}

      {activeBodyTasks.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {activeBodyTasks.map((task) => {
            const badge = STATUS_BADGE[task.status];
            return (
              <Card key={task.id}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">
                        {task.tipoPlastico === "frio" ? "Frío" : "Calor"} — {task.referencia}
                      </span>
                    </div>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                  <div className="text-sm space-y-1">
                    <Row label="Tipo de plástico" value={task.tipoPlastico === "frio" ? "Frío" : "Calor"} />
                    <Row label="Referencia" value={task.referencia} />
                    <Row label="Unidades" value={`${task.unidades}`} />
                    <Row label="Fecha" value={task.createdAt} />
                  </div>
                  <div className="flex gap-2 pt-1">
                    {task.status === "pendiente" && (
                      <Button size="sm" variant="outline" onClick={() => { updateBodyTaskStatus(task.id, "en_proceso"); toast.info("Producción de cuerpos iniciada."); }}>
                        <Play className="h-3 w-3 mr-1" /> Iniciar proceso
                      </Button>
                    )}
                    {task.status === "en_proceso" && (
                      <Button size="sm" onClick={() => { updateBodyTaskStatus(task.id, "finalizado"); toast.success("Producción de cuerpos finalizada."); }}>
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
                    <span className="text-sm font-medium">{task.tipoPlastico === "frio" ? "Frío" : "Calor"} — {task.referencia} ({task.unidades} uds)</span>
                    <Badge variant="outline">Finalizado</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </details>
      )}

      {/* ─── Sales Production Orders ─── */}
      <Separator />
      <h3 className="text-sm font-semibold text-foreground">
        Órdenes de producción ({activeOrders.length} activas)
      </h3>
      <p className="text-xs text-muted-foreground -mt-4">
        Estas órdenes se crean automáticamente desde la sección de Ventas.
      </p>

      {activeOrders.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No hay órdenes activas. Las órdenes se generan desde Ventas.</p>
      )}

      <div className="grid gap-4">
        {activeOrders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onStart={() => updateStageStatus(order.id, "en_proceso")}
            onFinish={() => {
              updateStageStatus(order.id, "finalizado");
              advanceStage(order.id);
              const isEmpaque = order.currentStage === "empaque";
              toast.success(
                isEmpaque
                  ? `Orden de ${order.clientName} completada. Enviada a Logística.`
                  : `${STAGE_LABELS[order.currentStage]} finalizada. Avanzando a la siguiente etapa.`
              );
            }}
          />
        ))}
      </div>

      {/* Completed */}
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
                      <p className="font-medium text-sm">{order.clientName}</p>
                      <p className="text-xs text-muted-foreground">{order.molde} — {order.quantity} uds</p>
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
    </div>
  );
};

/* ─── Order Card (for sales orders) ─── */

interface OrderCardProps {
  order: ReturnType<typeof useMagicalProductionStore.getState>["orders"][0];
  onStart: () => void;
  onFinish: () => void;
}

function OrderCard({ order, onStart, onFinish }: OrderCardProps) {
  const currentIdx = STAGE_ORDER.indexOf(order.currentStage);
  const Icon = STAGE_ICONS[order.currentStage];
  const badge = STATUS_BADGE[order.stageStatus];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{order.clientName}</CardTitle>
              <p className="text-xs text-muted-foreground">{order.molde} — {order.quantity} uds</p>
            </div>
          </div>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress bar */}
        <div className="flex items-center gap-1">
          {STAGE_ORDER.filter((s) => order.needsCuerpos || s !== "produccion_cuerpos").map((stage) => {
            const stageIdx = STAGE_ORDER.indexOf(stage);
            const isCurrent = stage === order.currentStage;
            const isDone = stageIdx < currentIdx || order.currentStage === "listo";
            return (
              <div key={stage} className="flex items-center gap-1 flex-1">
                <div
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    isDone ? "bg-primary" : isCurrent ? "bg-primary/40" : "bg-muted"
                  }`}
                  title={STAGE_LABELS[stage]}
                />
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Etapa actual: <span className="font-medium text-foreground">{STAGE_LABELS[order.currentStage]}</span>
          </span>
          <span className="text-xs text-muted-foreground">Creado: {order.createdAt}</span>
        </div>

        {order.currentStage === "estampacion" && (
          <div className="rounded-md border p-3 text-xs space-y-1">
            <Row label="Color de gel" value={order.gelColor} />
            <Row label="Color de tinta" value={order.inkColor} />
            <Row label="Molde / Referencia" value={order.molde} />
            {order.logoFile && <Row label="Logo" value={order.logoFile} />}
          </div>
        )}

        {order.observations && (
          <p className="text-xs text-muted-foreground italic">Obs: {order.observations}</p>
        )}

        <div className="flex gap-2 pt-1">
          {order.stageStatus === "pendiente" && (
            <Button size="sm" variant="outline" onClick={onStart}>
              <Play className="h-3 w-3 mr-1" /> Iniciar proceso
            </Button>
          )}
          {order.stageStatus === "en_proceso" && (
            <Button size="sm" onClick={onFinish}>
              <CheckCircle2 className="h-3 w-3 mr-1" /> Finalizar proceso
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Body Production Form ─── */

interface BodyProductionFormProps {
  onClose: () => void;
  onSubmit: (data: { tipoPlastico: PlasticoTipo; referencia: string; unidades: number }) => void;
}

function BodyProductionForm({ onClose, onSubmit }: BodyProductionFormProps) {
  const [tipoPlastico, setTipoPlastico] = useState<PlasticoTipo | null>(null);
  const [referencia, setReferencia] = useState("");
  const [unidades, setUnidades] = useState("");

  const canSubmit = tipoPlastico && referencia.trim() && unidades && parseInt(unidades) > 0;

  const handleSubmit = () => {
    if (!canSubmit || !tipoPlastico) return;
    onSubmit({
      tipoPlastico,
      referencia: referencia.trim(),
      unidades: parseInt(unidades),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nueva producción de cuerpos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tipo de plástico */}
        <div className="space-y-2">
          <Label>Tipo de plástico *</Label>
          <div className="grid grid-cols-2 gap-3">
            {PLASTICO_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = tipoPlastico === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTipoPlastico(opt.value)}
                  className={`flex items-center gap-3 rounded-lg border-2 p-4 transition-colors cursor-pointer ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-primary/5"
                  }`}
                >
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
            <Input placeholder="Ej: Muela, Lumbar, Antifaz..." value={referencia} onChange={(e) => setReferencia(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Unidades a producir *</Label>
            <Input type="number" min="1" placeholder="Ej: 200" value={unidades} onChange={(e) => setUnidades(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
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
