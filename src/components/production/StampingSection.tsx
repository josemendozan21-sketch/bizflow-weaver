import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StampingTaskCard } from "./StampingTaskCard";
import { useProductionStore } from "@/stores/productionStore";
import type { StampingStatus } from "@/types/production";

export function StampingSection() {
  const stampingTasks = useProductionStore((s) => s.stampingTasks);
  const [statusFilter, setStatusFilter] = useState<StampingStatus | "todos">("todos");
  const [brandFilter, setBrandFilter] = useState<"todos" | "magical" | "sweatspot">("todos");

  const filtered = stampingTasks.filter((t) => {
    if (statusFilter !== "todos" && t.status !== statusFilter) return false;
    if (brandFilter !== "todos" && t.brand !== brandFilter) return false;
    return true;
  });

  const counts = {
    pendiente: stampingTasks.filter((t) => t.status === "pendiente").length,
    en_proceso: stampingTasks.filter((t) => t.status === "en_proceso").length,
    completado: stampingTasks.filter((t) => t.status === "completado").length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <Badge variant="secondary" className="text-sm px-3 py-1">🟡 Pendientes: {counts.pendiente}</Badge>
        <Badge variant="default" className="text-sm px-3 py-1">🔵 En proceso: {counts.en_proceso}</Badge>
        <Badge variant="outline" className="text-sm px-3 py-1">✅ Completados: {counts.completado}</Badge>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StampingStatus | "todos")}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrar por estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="en_proceso">En proceso</SelectItem>
            <SelectItem value="completado">Completado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={brandFilter} onValueChange={(v) => setBrandFilter(v as typeof brandFilter)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filtrar por marca" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas las marcas</SelectItem>
            <SelectItem value="magical">Magical Warmers</SelectItem>
            <SelectItem value="sweatspot">Sweatspot</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">No hay tareas de estampación que coincidan con los filtros.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((task) => (
            <StampingTaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">Solo se muestran pedidos al por mayor que requieren estampación.</p>
    </div>
  );
}
