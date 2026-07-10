import { useState, useMemo, useEffect } from "react";
import { KPICards } from "@/components/dashboard/KPICards";
import { type KanbanOrder } from "@/components/dashboard/KanbanBoard";
import {
  InventoryQuickView,
  type InventoryItem,
} from "@/components/dashboard/InventoryQuickView";
import { AdminFocusPanels } from "@/components/dashboard/AdminFocusPanels";
import {
  DashboardFilters,
  type DashboardFilterValues,
} from "@/components/dashboard/DashboardFilters";
import { useProductionOrders } from "@/hooks/useProductionOrders";
import { useInventory, getStockStatus } from "@/hooks/useInventory";
import { differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AdminTodayDashboard } from "@/components/dashboard/AdminTodayDashboard";

const LOCATION_92 = "73050f3b-1c8e-44f1-9d0d-94772216c100";

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
  const { role } = useAuth();
  const [filters, setFilters] = useState<DashboardFilterValues>({
    brand: "todas",
    status: "todos",
    priority: "todas",
    date: undefined,
  });

  const { orders: productionOrders, isLoading: prodLoading } = useProductionOrders();
  const { stockItems, isLoading: invLoading } = useInventory();

  const [salesKpis, setSalesKpis] = useState({
    ventasDelDia: 0,
    pendienteAbono: 0,
    ventasMes92: 0,
    cajaEmpresa: 0,
  });

  useEffect(() => {
    (async () => {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [{ data: dayRows }, { data: monthRows }, { data: orderRows }, { data: banks }] =
        await Promise.all([
          supabase
            .from("pos_sales")
            .select("total_amount")
            .eq("location_id", LOCATION_92)
            .gte("sale_date", startOfDay.toISOString()),
          supabase
            .from("pos_sales")
            .select("total_amount")
            .eq("location_id", LOCATION_92)
            .gte("sale_date", startOfMonth.toISOString()),
          supabase
            .from("orders")
            .select("total_amount, abono")
            .eq("payment_complete", false),
          supabase.from("bank_accounts" as any).select("current_balance, active"),
        ]);

      const ventasDelDia = (dayRows ?? []).reduce(
        (s: number, r: any) => s + Number(r.total_amount || 0),
        0,
      );
      const ventasMes92 = (monthRows ?? []).reduce(
        (s: number, r: any) => s + Number(r.total_amount || 0),
        0,
      );
      const pendienteAbono = (orderRows ?? []).reduce(
        (s: number, r: any) =>
          s + Math.max(0, Number(r.total_amount || 0) - Number(r.abono || 0)),
        0,
      );
      const cajaEmpresa = (banks ?? [])
        .filter((b: any) => b.active !== false)
        .reduce((s: number, b: any) => s + Number(b.current_balance || 0), 0);
      setSalesKpis({ ventasDelDia, pendienteAbono, ventasMes92, cajaEmpresa });
    })();
  }, []);

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
      ...salesKpis,
    };
  }, [kanbanOrders, salesKpis]);

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

      {role === "admin" && <AdminTodayDashboard />}

      {role === "admin" && <AdminFocusPanels />}

      <KPICards kpis={kpis} />

      <InventoryQuickView items={inventoryItems} />
    </div>
  );
};

export default Index;
