import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";
import { toast } from "sonner";
import { useMagicalProductionStore } from "@/stores/magicalProductionStore";
import {
  STAGE_ORDER,
  STAGE_LABELS,
  type MagicalProductionStage,
  type StageStatus,
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

export const MagicalWarmersWorkflow = () => {
  const { orders, addOrder, updateStageStatus, advanceStage } = useMagicalProductionStore();
  const [showForm, setShowForm] = useState(false);

  const activeOrders = orders.filter((o) => o.currentStage !== "listo");
  const completedOrders = orders.filter((o) => o.currentStage === "listo");

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-foreground">Flujo de producción — Magical Warmers</p>
            <p className="text-sm text-muted-foreground mt-1">
              Cada pedido al por mayor pasa por las etapas: Cuerpos → Estampación → Dosificación → Sellado → Recorte → Empaque → Listo.
              Al completar todas las etapas, el pedido se envía automáticamente a Logística.
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

      {/* Actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Órdenes activas ({activeOrders.length})
        </h3>
        <Button size="sm" onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus className="h-4 w-4 mr-1" /> Nueva orden
        </Button>
      </div>

      {/* New order form */}
      {showForm && <NewOrderForm onClose={() => setShowForm(false)} onSubmit={(data) => { addOrder(data); setShowForm(false); toast.success("Orden de producción creada."); }} />}

      {/* Active orders */}
      {activeOrders.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-8">No hay órdenes activas. Crea una nueva orden para comenzar.</p>
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

/* ─── Order Card ─── */

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
          {STAGE_ORDER.filter((s) => order.needsCuerpos || s !== "produccion_cuerpos").map((stage, i, arr) => {
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

        {/* Current stage label */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Etapa actual: <span className="font-medium text-foreground">{STAGE_LABELS[order.currentStage]}</span>
          </span>
          <span className="text-xs text-muted-foreground">Creado: {order.createdAt}</span>
        </div>

        {/* Estampación details */}
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

        {/* Actions */}
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

/* ─── New Order Form ─── */

interface NewOrderFormProps {
  onClose: () => void;
  onSubmit: (data: Parameters<ReturnType<typeof useMagicalProductionStore.getState>["addOrder"]>[0]) => void;
}

function NewOrderForm({ onClose, onSubmit }: NewOrderFormProps) {
  const [clientName, setClientName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [gelColor, setGelColor] = useState("");
  const [inkColor, setInkColor] = useState("");
  const [molde, setMolde] = useState("");
  const [logoFile, setLogoFile] = useState("");
  const [observations, setObservaciones] = useState("");
  const [needsCuerpos, setNeedsCuerpos] = useState(false);

  const canSubmit = clientName.trim() && quantity && gelColor.trim() && inkColor.trim() && molde.trim();

  const handleSubmit = () => {
    if (!canSubmit) {
      toast.error("Completa todos los campos obligatorios.");
      return;
    }
    onSubmit({
      clientName: clientName.trim(),
      quantity: parseInt(quantity),
      gelColor: gelColor.trim(),
      inkColor: inkColor.trim(),
      molde: molde.trim(),
      logoFile: logoFile.trim() || undefined,
      observations: observations.trim() || undefined,
      needsCuerpos,
      currentStage: needsCuerpos ? "produccion_cuerpos" : "estampacion",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nueva orden de producción</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Input placeholder="Nombre del cliente" value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Cantidad *</Label>
            <Input type="number" min="1" placeholder="Ej: 200" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Color de gel *</Label>
            <Input placeholder="Ej: Azul" value={gelColor} onChange={(e) => setGelColor(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Color de tinta *</Label>
            <Input placeholder="Ej: Dorado" value={inkColor} onChange={(e) => setInkColor(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Molde / Referencia *</Label>
            <Input placeholder="Ej: MW-Frío-001" value={molde} onChange={(e) => setMolde(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Archivo de logo</Label>
            <Input placeholder="Nombre del archivo (opcional)" value={logoFile} onChange={(e) => setLogoFile(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Observaciones</Label>
          <Textarea placeholder="Notas opcionales..." value={observations} onChange={(e) => setObservaciones(e.target.value)} rows={2} />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="needsCuerpos"
            checked={needsCuerpos}
            onChange={(e) => setNeedsCuerpos(e.target.checked)}
            className="rounded border-input"
          />
          <Label htmlFor="needsCuerpos" className="text-sm font-normal cursor-pointer">
            Requiere producción de cuerpos (stock insuficiente)
          </Label>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            <Plus className="h-4 w-4 mr-1" /> Crear orden
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
