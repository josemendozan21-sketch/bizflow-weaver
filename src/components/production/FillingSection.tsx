import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Info } from "lucide-react";
import { FillingTaskCard } from "./FillingTaskCard";
import { GelRequirementsPanel } from "./GelRequirementsPanel";
import { useProductionStore } from "@/stores/productionStore";

export function FillingSection() {
  const fillingTasks = useProductionStore((s) => s.fillingTasks);

  const counts = {
    pendiente: fillingTasks.filter((t) => t.status === "pendiente").length,
    en_proceso: fillingTasks.filter((t) => t.status === "en_proceso").length,
    completado: fillingTasks.filter((t) => t.status === "completado").length,
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-foreground">¿Qué hacer aquí?</p>
            <p className="text-sm text-muted-foreground mt-1">
              Gestiona las tareas de llenado y dosificación. Las tareas se crean automáticamente cuando se completa una estampación de Magical Warmers. Solo necesitas avanzar el estado de cada tarea.
            </p>
          </div>
        </div>
      </div>

      {/* Status summary */}
      <div className="flex flex-wrap gap-3">
        <Badge variant="secondary" className="text-sm px-3 py-1">🟡 Pendientes: {counts.pendiente}</Badge>
        <Badge variant="default" className="text-sm px-3 py-1">🔵 En proceso: {counts.en_proceso}</Badge>
        <Badge variant="outline" className="text-sm px-3 py-1">✅ Completados: {counts.completado}</Badge>
      </div>

      <GelRequirementsPanel />

      {fillingTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No hay tareas de llenado activas.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Las tareas aparecen aquí automáticamente al completar una estampación de Magical Warmers.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {fillingTasks.map((task) => (
            <FillingTaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
