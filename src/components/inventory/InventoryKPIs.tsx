import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Inbox,
  PackageCheck,
  Factory,
  Wrench,
  AlertTriangle,
} from "lucide-react";
import { useInventoryKPIs } from "@/hooks/useInventoryKPIs";
import { cn } from "@/lib/utils";

interface KPICardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  variant: "default" | "warning" | "success" | "info" | "danger";
  loading?: boolean;
}

const VARIANT_STYLES: Record<KPICardProps["variant"], string> = {
  default: "bg-card border-border",
  warning: "bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900",
  success: "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900",
  info: "bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900",
  danger: "bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-900",
};

const ICON_STYLES: Record<KPICardProps["variant"], string> = {
  default: "text-muted-foreground bg-muted",
  warning: "text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300",
  success: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300",
  info: "text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300",
  danger: "text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-300",
};

function KPICard({ label, value, icon: Icon, variant, loading }: KPICardProps) {
  return (
    <Card className={cn("border shadow-none", VARIANT_STYLES[variant])}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", ICON_STYLES[variant])}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground leading-tight truncate">{label}</p>
          {loading ? (
            <Skeleton className="h-6 w-14 mt-1" />
          ) : (
            <p className="text-xl font-bold text-foreground">{value.toLocaleString("es-CO")}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function InventoryKPIs() {
  const { pendingReview, reserved, awaitingProduction, activeProductionOrders, stockAlerts, isLoading } =
    useInventoryKPIs();

  const cards: KPICardProps[] = [
    {
      label: "Pedidos pendientes de revisión",
      value: pendingReview,
      icon: Inbox,
      variant: "info",
    },
    {
      label: "Pedidos reservados",
      value: reserved,
      icon: PackageCheck,
      variant: "success",
    },
    {
      label: "Pedidos esperando producción",
      value: awaitingProduction,
      icon: Factory,
      variant: "warning",
    },
    {
      label: "Órdenes de producción activas",
      value: activeProductionOrders,
      icon: Wrench,
      variant: "default",
    },
    {
      label: "Alertas de stock mínimo",
      value: stockAlerts,
      icon: AlertTriangle,
      variant: stockAlerts > 0 ? "danger" : "default",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {cards.map((card) => (
        <KPICard key={card.label} {...card} loading={isLoading} />
      ))}
    </div>
  );
}
