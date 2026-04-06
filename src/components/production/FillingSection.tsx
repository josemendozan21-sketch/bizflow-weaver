import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FillingTaskCard } from "./FillingTaskCard";
import { GelRequirementsPanel } from "./GelRequirementsPanel";
import { useProductionStore } from "@/stores/productionStore";
import { useState } from "react";
import type { FillingTask } from "@/types/production";

export function FillingSection() {
  const fillingTasks = useProductionStore((s) => s.fillingTasks);
  const [statusFilter, setStatusFilter] = useState<FillingTask["status"] | "todos">("todos");

  const filtered = fillingTasks.filter((t) =>
    statusFilter === "todos" ? true : t.status === statusFilter
  );

  const counts = {
    pendiente: fillingTasks.filter((t) => t.status === "pendiente").length,
    en_proceso: fillingTasks.filter((t) => t.status === "en_proceso").length,
    completado: fillingTasks.filter((t) => t.status === "completado").length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <Badge variant="secondary" className="text-sm px-3 py-1">🟡 Pendientes: {counts.pendiente}</Badge>
        <Badge variant="default" className="text-sm px-3 py-1">🔵 En proceso: {counts.en_proceso}</Badge>
        <Badge variant="outline" className="text-sm px-3 py-1">✅ Completados: {counts.completado}</Badge>
      </div>

      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filtrar por estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos los estados</SelectItem>
          <SelectItem value="pendiente">Pendiente</SelectItem>
          <SelectItem value="en_proceso">En proceso</SelectItem>
          <SelectItem value="completado">Completado</SelectItem>
        </SelectContent>
      </Select>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">
          No hay tareas de llenado activas. Las tareas se crean automáticamente cuando una estampación de Magical Warmers se marca como completada.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((task) => (
            <FillingTaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Las tareas de llenado se generan automáticamente desde estampación (solo Magical Warmers).
      </p>
    </div>
  );
}
