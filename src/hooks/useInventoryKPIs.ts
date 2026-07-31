import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useInventory } from "@/hooks/useInventory";

const ACTIVE_STATUSES = [
  "pendiente", "diseno", "produccion_cuerpos", "estampacion",
  "dosificacion", "sellado", "recorte", "empaque", "listo",
];

const RECENT_SINCE = "2026-05-15";

interface OrderRow {
  id: string;
  sale_type: string;
  production_status: string;
  created_at: string;
}

interface MovementRow {
  order_id: string | null;
  movement_kind: string | null;
}

interface ProductionRow {
  id: string;
  order_id: string | null;
  completed_at: string | null;
}

export interface InventoryKPIsData {
  pendingReview: number;
  reserved: number;
  awaitingProduction: number;
  activeProductionOrders: number;
  stockAlerts: number;
  isLoading: boolean;
}

export function useInventoryKPIs(): InventoryKPIsData {
  const { stockItems, isLoading: inventoryLoading } = useInventory();

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["inventory-kpi-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, sale_type, production_status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as OrderRow[];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const { data: movements = [], isLoading: movementsLoading } = useQuery({
    queryKey: ["inventory-kpi-movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("order_id, movement_kind")
        .not("order_id", "is", null);
      if (error) throw error;
      return (data || []) as MovementRow[];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const { data: prodOrders = [], isLoading: prodLoading } = useQuery({
    queryKey: ["inventory-kpi-production"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_orders")
        .select("id, order_id, completed_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ProductionRow[];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const kpis = useMemo(() => {
    const mayorOrders = orders.filter(
      (o) => o.sale_type === "mayor" && o.created_at >= RECENT_SINCE
    );
    const activeRetail = orders.filter(
      (o) => o.sale_type === "menor" && ACTIVE_STATUSES.includes(o.production_status)
    );
    const activeOrders = [...mayorOrders, ...activeRetail];
    const activeOrderIds = new Set(activeOrders.map((o) => o.id));

    const deliveredIds = new Set<string>();
    const reservedIds = new Set<string>();
    movements.forEach((m) => {
      if (!m.order_id || !activeOrderIds.has(m.order_id)) return;
      if (m.movement_kind === "reserva") {
        reservedIds.add(m.order_id);
      } else {
        deliveredIds.add(m.order_id);
      }
    });

    const inProductionOrderIds = new Set<string>();
    prodOrders.forEach((p) => {
      if (p.order_id && !p.completed_at && activeOrderIds.has(p.order_id)) {
        inProductionOrderIds.add(p.order_id);
      }
    });

    const pendingReview = activeOrders.filter(
      (o) =>
        !deliveredIds.has(o.id) &&
        !reservedIds.has(o.id) &&
        !inProductionOrderIds.has(o.id)
    ).length;

    const reserved = activeOrders.filter(
      (o) =>
        reservedIds.has(o.id) &&
        !deliveredIds.has(o.id) &&
        !inProductionOrderIds.has(o.id)
    ).length;

    const awaitingProduction = activeOrders.filter(
      (o) => inProductionOrderIds.has(o.id) && !deliveredIds.has(o.id)
    ).length;

    const activeProductionOrders = prodOrders.filter((p) => !p.completed_at).length;

    const stockAlerts = stockItems.filter(
      (si) => si.min_stock > 0 && si.available <= si.min_stock
    ).length;

    return {
      pendingReview,
      reserved,
      awaitingProduction,
      activeProductionOrders,
      stockAlerts,
    };
  }, [orders, movements, prodOrders, stockItems]);

  return {
    ...kpis,
    isLoading: inventoryLoading || ordersLoading || movementsLoading || prodLoading,
  };
}
