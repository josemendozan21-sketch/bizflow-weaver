import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Zap, FileImage, Droplets, Paintbrush, Sparkles, Layers, Ruler, CircleDot, ArrowRight, PackageCheck } from "lucide-react";
import magicalLogo from "@/assets/magical-warmers-logo.png";
import type { StampingTask, StampingStatus } from "@/types/production";
import { useProductionStore } from "@/stores/productionStore";
import { toast } from "sonner";

const statusConfig: Record<StampingStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  pendiente: { label: "Pendiente", variant: "secondary" },
  en_proceso: { label: "En proceso", variant: "default" },
  completado: { label: "Completado", variant: "outline" },
};

export function StampingTaskCard({ task }: { task: StampingTask }) {
  const updateStampingStatus = useProductionStore((s) => s.updateStampingStatus);
  const status = statusConfig[task.status];
  const isMagical = task.brand === "magical";

  const handleAdvance = () => {
    if (task.status === "pendiente") {
      updateStampingStatus(task.id, "en_proceso");
      toast.info("Tarea movida a 'En proceso'.");
    } else if (task.status === "en_proceso") {
      updateStampingStatus(task.id, "completado");
      if (isMagical) {
        toast.success("Estampación completada. Se creó tarea de llenado automáticamente.");
      } else {
        toast.success("Estampación completada. Listo para sellado final.");
      }
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {isMagical ? <img src={magicalLogo} alt="Magical Warmers" className="h-5 w-auto object-contain shrink-0" /> : <Zap className="h-5 w-5 text-primary shrink-0" />}
            <CardTitle className="text-base">{isMagical ? "Magical Warmers" : "Sweatspot"}</CardTitle>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <InfoRow label="Cliente" value={task.clientName} />
          <InfoRow label="Cantidad" value={String(task.quantity)} />
        </div>

        <Separator />

        {isMagical ? (
          <MagicalDetails task={task as Extract<StampingTask, { brand: "magical" }>} />
        ) : (
          <SweatspotDetails task={task as Extract<StampingTask, { brand: "sweatspot" }>} />
        )}

        {task.observations && (
          <>
            <Separator />
            <div className="text-sm">
              <span className="font-medium text-foreground">Observaciones:</span>
              <p className="mt-1 text-muted-foreground">{task.observations}</p>
            </div>
          </>
        )}

        {/* Status badges for completed sweatspot */}
        {task.status === "completado" && !isMagical && (task as any).readyForSealing && (
          <>
            <Separator />
            <div className="flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Listo para sellado final</span>
            </div>
          </>
        )}

        {/* Action buttons */}
        {task.status !== "completado" && (
          <>
            <Separator />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdvance}>
                <ArrowRight className="h-4 w-4 mr-1" />
                {task.status === "pendiente" ? "Iniciar estampación" : "Marcar como estampado"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MagicalDetails({ task }: { task: Extract<StampingTask, { brand: "magical" }> }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Detalles de estampación</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <IconRow icon={<Paintbrush className="h-4 w-4" />} label="Color de tinta" value={task.inkColor} />
        <IconRow icon={<Droplets className="h-4 w-4" />} label="Color de gel" value={task.gelColor} />
        <IconRow icon={<Sparkles className="h-4 w-4" />} label="Escarcha" value={task.glitter ? "Sí" : "No"} />
        <IconRow icon={<Layers className="h-4 w-4" />} label="Doble tinta" value={task.doubleInk ? "Sí" : "No"} />
      </div>
      {task.logoFile && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileImage className="h-4 w-4" />
          <span>Logo adjunto: <span className="text-foreground">{task.logoFile}</span></span>
        </div>
      )}
    </div>
  );
}

function SweatspotDetails({ task }: { task: Extract<StampingTask, { brand: "sweatspot" }> }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Detalles de estampación</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <IconRow icon={<Ruler className="h-4 w-4" />} label="Tamaño" value={task.thermoSize} />
        <IconRow icon={<CircleDot className="h-4 w-4" />} label="Color de silicona" value={task.siliconeColor} />
        <IconRow icon={<Paintbrush className="h-4 w-4" />} label="Color de tinta" value={task.inkColor} />
      </div>
      {task.logoFile && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileImage className="h-4 w-4" />
          <span>Logo adjunto: <span className="text-foreground">{task.logoFile}</span></span>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span>{" "}
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function IconRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}:</span>{" "}
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
