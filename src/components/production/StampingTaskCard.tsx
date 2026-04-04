import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Zap, Flame, FileImage, Droplets, Paintbrush, Sparkles, Layers, Ruler, CircleDot } from "lucide-react";
import type { StampingTask, StampingStatus } from "@/types/production";

const statusConfig: Record<StampingStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  pendiente: { label: "Pendiente", variant: "secondary" },
  en_proceso: { label: "En proceso", variant: "default" },
  completado: { label: "Completado", variant: "outline" },
};

export function StampingTaskCard({ task }: { task: StampingTask }) {
  const status = statusConfig[task.status];
  const isMagical = task.brand === "magical";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {isMagical ? (
              <Flame className="h-5 w-5 text-primary shrink-0" />
            ) : (
              <Zap className="h-5 w-5 text-primary shrink-0" />
            )}
            <CardTitle className="text-base">
              {isMagical ? "Magical Warmers" : "Sweatspot"}
            </CardTitle>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* General info */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <InfoRow label="Cliente" value={task.clientName} />
          <InfoRow label="Cantidad" value={String(task.quantity)} />
        </div>

        <Separator />

        {/* Brand-specific fields */}
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
      </CardContent>
    </Card>
  );
}

function MagicalDetails({ task }: { task: Extract<StampingTask, { brand: "magical" }> }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Detalles de estampación
      </p>
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
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Detalles de estampación
      </p>
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
