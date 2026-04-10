import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Droplets, FileImage, Package } from "lucide-react";
import magicalLogo from "@/assets/magical-warmers-logo.png";
import type { FillingTask } from "@/types/production";
import { useProductionStore } from "@/stores/productionStore";

const statusConfig = {
  pendiente: { label: "Pendiente", variant: "secondary" as const },
  en_proceso: { label: "En proceso", variant: "default" as const },
  completado: { label: "Completado", variant: "outline" as const },
};

export function FillingTaskCard({ task }: { task: FillingTask }) {
  const updateFillingStatus = useProductionStore((s) => s.updateFillingStatus);
  const status = statusConfig[task.status];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary shrink-0" />
            <CardTitle className="text-base">Magical Warmers</CardTitle>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <InfoRow label="Cliente" value={task.clientName} />
          <InfoRow label="Cantidad" value={String(task.quantity)} />
          <InfoRow label="Producto" value={task.product} />
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Detalles de llenado
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Color de gel:</span>{" "}
              <span className="font-medium text-foreground">{task.gelColor}</span>
            </div>
          </div>
          {task.logoFile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileImage className="h-4 w-4" />
              <span>Diseño: <span className="text-foreground">{task.logoFile}</span></span>
            </div>
          )}
        </div>

        {task.observations && (
          <>
            <Separator />
            <div className="text-sm">
              <span className="font-medium text-foreground">Observaciones:</span>
              <p className="mt-1 text-muted-foreground">{task.observations}</p>
            </div>
          </>
        )}

        {task.status !== "completado" && (
          <>
            <Separator />
            <div className="flex gap-2">
              {task.status === "pendiente" && (
                <Button size="sm" onClick={() => updateFillingStatus(task.id, "en_proceso")}>
                  <Package className="h-4 w-4 mr-1" /> Iniciar llenado
                </Button>
              )}
              {task.status === "en_proceso" && (
                <Button size="sm" onClick={() => updateFillingStatus(task.id, "completado")}>
                  <Package className="h-4 w-4 mr-1" /> Marcar como completado
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
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
