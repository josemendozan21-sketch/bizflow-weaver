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
import { useProductionOrders } from "@/hooks/useProductionOrders";
import { useInventory, getStockStatus } from "@/hooks/useInventory";
import { differenceInDays } from "date-fns";

/* ── helpers ── */

/** Map production_orders.current_stage to kanban column keys */
const stageToKanban: Record<string, string> = {
  pendiente: "pendiente",
  produccion_cuerpos: "cuerpos",
  estampacion: "estampacion",
  dosificacion: "dosificacion",
  sellado: "dosificacion", // group with dosificacion
  recorte: "dosificacion",
  empaque: "dosificacion",
  produccion_tubos: "estampacion",
  ensamble_cuello: "estampacion",
  sello_base: "dosificacion",
  refile: "dosificacion",
  colocacion_boquilla: "dosificacion",
  listo: "finalizado",
};

/** Derive priority from order age */
function derivePriority(createdAt: string): "alta" | "media" | "baja" {
  const days = differenceInDays(new Date(), new Date(createdAt));
  if (days >= 5) return "alta";
  if (days >= 2) return "media";
  return "baja";
}

/* ── page ── */

const Index = () => {
  const [filters, setFilters] = useState<DashboardFilterValues>({
    brand: "todas",
    status: "todos",
    priority: "todas",
    date: undefined,
  });

  const { orders: productionOrders, isLoading: prodLoading } = useProductionOrders();
  const { stockItems, isLoading: invLoading } = useInventory();

  /* Map production orders to kanban cards */
  const kanbanOrders: KanbanOrder[] = useMemo(() => {
    return productionOrders.map((po) => ({
      id: po.id,
      clientName: po.client_name,
      brand: po.brand as "sweatspot" | "magical",
      quantity: po.quantity,
      status: stageToKanban[po.current_stage] || "pendiente",
      priority: derivePriority(po.created_at),
    }));
  }, [productionOrders]);

  /* Filtered orders for kanban */
  const filteredOrders = useMemo(() => {
    return kanbanOrders.filter((o) => {
      if (filters.brand !== "todas" && o.brand !== filters.brand) return false;
      if (filters.status !== "todos" && o.status !== filters.status) return false;
      if (filters.priority !== "todas" && o.priority !== filters.priority) return false;
      return true;
    });
  }, [kanbanOrders, filters]);

  /* KPIs from real data */
  const kpis = useMemo(() => {
    const active = kanbanOrders.filter((o) => o.status !== "finalizado");
    return {
      pedidosActivos: active.length,
      enProduccion: kanbanOrders.filter((o) => o.status === "cuerpos").length,
      enEstampacion: kanbanOrders.filter((o) => o.status === "estampacion").length,
      enDosificacion: kanbanOrders.filter((o) => o.status === "dosificacion").length,
      retrasados: kanbanOrders.filter((o) => o.priority === "alta" && o.status !== "finalizado").length,
      finalizados: kanbanOrders.filter((o) => o.status === "finalizado").length,
    };
  }, [kanbanOrders]);

  /* Alerts from real data */
  const alerts: DashboardAlert[] = useMemo(() => {
    const result: DashboardAlert[] = [];

    // Low inventory alerts
    stockItems
      .filter((item) => item.category === "producto_terminado" && getStockStatus(item) !== "ok")
      .forEach((item) => {
        result.push({
          id: `inv-${item.id}`,
          type: "inventario",
          message: `${item.name} (${item.brand === "magical" ? "Magical" : "Sweatspot"}): solo ${item.available} unidades disponibles.`,
        });
      });

    // Delayed orders (5+ days without finishing)
    productionOrders
      .filter((po) => po.current_stage !== "listo" && differenceInDays(new Date(), new Date(po.created_at)) >= 5)
      .forEach((po) => {
        const days = differenceInDays(new Date(), new Date(po.created_at));
        result.push({
          id: `delay-${po.id}`,
          type: "atrasado",
          message: `Pedido de ${po.client_name} lleva ${days} días en ${po.current_stage.replace(/_/g, " ")}.`,
        });
      });

    return result;
  }, [stockItems, productionOrders]);

  /* Inventory quick view — finished product totals + critical items */
  const inventoryItems: InventoryItem[] = useMemo(() => {
    return stockItems
      .filter((item) => item.category === "producto_terminado")
      .map((item) => ({
        reference: item.name,
        brand: item.brand as "sweatspot" | "magical",
        stock: item.available,
        minStock: item.min_stock,
      }));
  }, [stockItems]);

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
        <AlertsPanel alerts={alerts} />
        <InventoryQuickView items={inventoryItems} />
      </div>
    </div>
  );
};

export default Index;
