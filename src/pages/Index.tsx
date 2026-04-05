import { useState, useMemo } from "react";
import { KPICards } from "@/components/dashboard/KPICards";
import { KanbanBoard, type KanbanOrder } from "@/components/dashboard/KanbanBoard";
import { AlertsPanel, type DashboardAlert } from "@/components/dashboard/AlertsPanel";
import {
  InventoryQuickView,
  type InventoryItem,
} from "@/components/dashboard/InventoryQuickView";
import {
  DashboardFilters,
  type DashboardFilterValues,
} from "@/components/dashboard/DashboardFilters";
import { useProductionStore } from "@/stores/productionStore";

/* ── demo data ── */

const DEMO_ORDERS: KanbanOrder[] = [
  { id: "k1", clientName: "Distribuciones ABC", brand: "magical", quantity: 200, status: "estampacion", priority: "alta" },
  { id: "k2", clientName: "Fitness Corp", brand: "sweatspot", quantity: 500, status: "estampacion", priority: "media" },
  { id: "k3", clientName: "Regalos Express", brand: "magical", quantity: 100, status: "pendiente", priority: "baja" },
  { id: "k4", clientName: "GymPro S.A.", brand: "sweatspot", quantity: 300, status: "pendiente", priority: "media" },
  { id: "k5", clientName: "Tienda Natural", brand: "magical", quantity: 150, status: "diseno", priority: "alta" },
  { id: "k6", clientName: "Deporte Total", brand: "sweatspot", quantity: 250, status: "cuerpos", priority: "media" },
  { id: "k7", clientName: "BioMarket", brand: "magical", quantity: 80, status: "dosificacion", priority: "baja" },
  { id: "k8", clientName: "Salud & Vida", brand: "magical", quantity: 120, status: "finalizado", priority: "media" },
  { id: "k9", clientName: "ProGym", brand: "sweatspot", quantity: 400, status: "finalizado", priority: "alta" },
];

const DEMO_ALERTS: DashboardAlert[] = [
  { id: "a1", type: "inventario", message: "Termo 500 ml Sweatspot: solo 12 unidades disponibles." },
  { id: "a2", type: "atrasado", message: "Pedido de Distribuciones ABC lleva 3 días en estampación." },
  { id: "a3", type: "urgente", message: "Tienda Natural solicitó entrega express para el viernes." },
  { id: "a4", type: "diseno", message: "Logo de Regalos Express pendiente de aprobación." },
];

const DEMO_INVENTORY: InventoryItem[] = [
  { reference: "Termo 500 ml", brand: "sweatspot", stock: 12, minStock: 50 },
  { reference: "Termo 250 ml", brand: "sweatspot", stock: 85, minStock: 40 },
  { reference: "Termo 150 ml", brand: "sweatspot", stock: 200, minStock: 30 },
  { reference: "Warmer Clásico", brand: "magical", stock: 25, minStock: 60 },
  { reference: "Warmer Mini", brand: "magical", stock: 110, minStock: 40 },
];

/* ── page ── */

const Index = () => {
  const [filters, setFilters] = useState<DashboardFilterValues>({
    brand: "todas",
    status: "todos",
    priority: "todas",
    date: undefined,
  });

  const { stampingTasks, fillingTasks } = useProductionStore();

  const filteredOrders = useMemo(() => {
    return DEMO_ORDERS.filter((o) => {
      if (filters.brand !== "todas" && o.brand !== filters.brand) return false;
      if (filters.status !== "todos" && o.status !== filters.status) return false;
      if (filters.priority !== "todas" && o.priority !== filters.priority) return false;
      return true;
    });
  }, [filters]);

  const kpis = useMemo(() => {
    const active = DEMO_ORDERS.filter((o) => o.status !== "finalizado");
    return {
      pedidosActivos: active.length,
      enProduccion: DEMO_ORDERS.filter((o) => o.status === "cuerpos").length,
      enEstampacion: DEMO_ORDERS.filter((o) => o.status === "estampacion").length + stampingTasks.filter((t) => t.status === "en_proceso").length,
      enDosificacion: DEMO_ORDERS.filter((o) => o.status === "dosificacion").length + fillingTasks.filter((t) => t.status === "en_proceso").length,
      retrasados: DEMO_ALERTS.filter((a) => a.type === "atrasado").length,
      finalizados: DEMO_ORDERS.filter((o) => o.status === "finalizado").length,
    };
  }, [stampingTasks, fillingTasks]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Panel de operaciones</h1>
          <p className="text-sm text-muted-foreground">
            Resumen general del sistema Bionovations
          </p>
        </div>
        <DashboardFilters filters={filters} onChange={setFilters} />
      </div>

      <KPICards kpis={kpis} />

      <KanbanBoard orders={filteredOrders} />

      <div className="grid gap-4 md:grid-cols-2">
        <AlertsPanel alerts={DEMO_ALERTS} />
        <InventoryQuickView items={DEMO_INVENTORY} />
      </div>
    </div>
  );
};

export default Index;
