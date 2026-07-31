import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useInventory, getStockStatus, type SupabaseStockItem } from "@/hooks/useInventory";
import {
  Inbox,
  PackageCheck,
  Clock,
  Factory,
  AlertTriangle,
} from "lucide-react";

interface DashboardMetric {
  key: string;
  label: string;
  value: number;
  icon: React.ElementType;
  color: "blue" | "emerald" | "amber" | "violet" | "rose";
  detail?: string;
}

const colorClasses: Record<DashboardMetric["color"], string> = {
  blue: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  amber: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  violet: "bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900",
  rose: "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900",
};

const iconBgClasses: Record<DashboardMetric["color"], string> = {
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300",
  emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300",
  violet: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300",
  rose: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300",
};

function useInventoryDashboardStats() {
  const { stockItems, isLoading: stockLoading } = useInventory();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["inventory-dashboard-stats"],
    queryFn: async () => {
      const [ordersRes, reservationsRes, productionRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, production_status, sale_type")
          .eq("sale_type", "mayor")
          .gte("created_at", "2026-05-15"),
        supabase
          .from("inventory_movements")
          .select("order_id, movement_kind")
          .eq("movement_kind", "reserva")
          .not("order_id", "is", null),
        supabase
          .from("production_orders")
          .select("id, stage_status, completed_at"),
      ]);

      const orders = (ordersRes.data || []) as Array<{
        id: string;
        production_status: string;
        sale_type: string;
      }>;
      const reservations = (reservationsRes.data || []) as Array<{
        order_id: string;
        movement_kind: string;
      }>;
      const productionOrders = (productionRes.data || []) as Array<{
        id: string;
        stage_status: string;
        completed_at: string | null;
      }>;

      const reservedOrderIds = new Set(
        reservations.map((r) => r.order_id).filter(Boolean)
      );

      const pendingReview = orders.filter(
        (o) => o.production_status === "pendiente"
      ).length;

      const reserved = orders.filter(
        (o) =>
          reservedOrderIds.has(o.id) && o.production_status !== "entregado"
      ).length;

      const waitingProduction = productionOrders.filter(
        (p) =>
          !p.completed_at &&
          p.stage_status === "pendiente"
      ).length;

      const activeProduction = productionOrders.filter(
        (p) =>
          !p.completed_at &&
          p.stage_status === "en_proceso"
      ).length;

      return {
        pendingReview,
        reserved,
        waitingProduction,
        activeProduction,
      };
    },
    refetchInterval: 15_000,
  });

  const stockAlerts = useMemo(() => {
    return stockItems.filter(
      (item: SupabaseStockItem) =>
        item.min_stock > 0 && getStockStatus(item) !== "ok"
    ).length;
  }, [stockItems]);

  const metrics: DashboardMetric[] = useMemo(
    () => [
      {
        key: "pendingReview",
        label: "Pedidos pendientes de revisión",
        value: stats?.pendingReview ?? 0,
        icon: Inbox,
        color: "blue",
      },
      {
        key: "reserved",
        label: "Pedidos reservados",
        value: stats?.reserved ?? 0,
        icon: PackageCheck,
        color: "emerald",
      },
      {
        key: "waitingProduction",
        label: "Pedidos esperando producción",
        value: stats?.waitingProduction ?? 0,
        icon: Clock,
        color: "amber",
      },
      {
        key: "activeProduction",
        label: "Órdenes de producción activas",
        value: stats?.activeProduction ?? 0,
        icon: Factory,
        color: "violet",
      },
      {
        key: "stockAlerts",
        label: "Alertas de stock mínimo",
        value: stockAlerts,
        icon: AlertTriangle,
        color: "rose",
      },
    ],
    [stats, stockAlerts]
  );

  return { metrics, isLoading: statsLoading || stockLoading };
}

export function InventoryDashboardSummary() {
  const { metrics, isLoading } = useInventoryDashboardStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card
            key={metric.key}
            className={`border ${colorClasses[metric.color]}`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium leading-tight">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBgClasses[metric.color]}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">
                      {metric.value.toLocaleString("es-CO")}
                    </p>
                    {metric.detail && (
                      <p className="text-xs opacity-80">{metric.detail}</p>
                    )}
                  </div>
                </div>
                {metric.value > 0 && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${colorClasses[metric.color]}`}
                  >
                    {metric.value === 1 ? "1 ítem" : `${metric.value} ítems`}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default InventoryDashboardSummary;
