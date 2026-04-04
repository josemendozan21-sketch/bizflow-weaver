import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StampingTaskCard } from "./StampingTaskCard";
import type { StampingTask, StampingStatus } from "@/types/production";

// Demo data — will be replaced once backend is connected
const DEMO_TASKS: StampingTask[] = [
  {
    id: "1",
    brand: "magical",
    clientName: "Distribuciones ABC",
    quantity: 200,
    status: "pendiente",
    inkColor: "Dorado",
    gelColor: "Azul",
    glitter: true,
    doubleInk: false,
    logoFile: "logo_abc.png",
    observations: "El cliente solicita empaque individual.",
    createdAt: "2026-04-02",
  },
  {
    id: "2",
    brand: "sweatspot",
    clientName: "Fitness Corp",
    quantity: 500,
    status: "en_proceso",
    inkColor: "Negro",
    thermoSize: "500 ml",
    siliconeColor: "Rojo",
    logoFile: "fitness_corp_logo.svg",
    createdAt: "2026-04-01",
  },
  {
    id: "3",
    brand: "magical",
    clientName: "Regalos Express",
    quantity: 100,
    status: "completado",
    inkColor: "Blanco",
    gelColor: "Rosa",
    glitter: false,
    doubleInk: true,
    createdAt: "2026-03-28",
  },
  {
    id: "4",
    brand: "sweatspot",
    clientName: "GymPro S.A.",
    quantity: 300,
    status: "pendiente",
    inkColor: "Azul",
    thermoSize: "250 ml",
    siliconeColor: "Negro",
    logoFile: "gympro.png",
    observations: "Incluir caja de presentación.",
    createdAt: "2026-04-03",
  },
];

export function StampingSection() {
  const [statusFilter, setStatusFilter] = useState<StampingStatus | "todos">("todos");
  const [brandFilter, setBrandFilter] = useState<"todos" | "magical" | "sweatspot">("todos");

  const filtered = DEMO_TASKS.filter((t) => {
    if (statusFilter !== "todos" && t.status !== statusFilter) return false;
    if (brandFilter !== "todos" && t.brand !== brandFilter) return false;
    return true;
  });

  const counts = {
    pendiente: DEMO_TASKS.filter((t) => t.status === "pendiente").length,
    en_proceso: DEMO_TASKS.filter((t) => t.status === "en_proceso").length,
    completado: DEMO_TASKS.filter((t) => t.status === "completado").length,
  };

  return (
    <div className="space-y-5">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-3">
        <Badge variant="secondary" className="text-sm px-3 py-1">
          🟡 Pendientes: {counts.pendiente}
        </Badge>
        <Badge variant="default" className="text-sm px-3 py-1">
          🔵 En proceso: {counts.en_proceso}
        </Badge>
        <Badge variant="outline" className="text-sm px-3 py-1">
          ✅ Completados: {counts.completado}
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StampingStatus | "todos")}>
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

        <Select value={brandFilter} onValueChange={(v) => setBrandFilter(v as typeof brandFilter)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por marca" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas las marcas</SelectItem>
            <SelectItem value="magical">Magical Warmers</SelectItem>
            <SelectItem value="sweatspot">Sweatspot</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task cards */}
      {filtered.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">
          No hay tareas de estampación que coincidan con los filtros.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((task) => (
            <StampingTaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Solo se muestran pedidos al por mayor que requieren estampación.
      </p>
    </div>
  );
}
