import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle, Clock, Loader2, CheckCircle2, ChevronRight,
  Beaker, Box, Droplets, PackageCheck, Bell,
} from "lucide-react";
import { useInventoryStore, type InventoryBrand, type InventoryCategory } from "@/stores/inventoryStore";
import { useMemo } from "react";

const BRANDS: { value: InventoryBrand; label: string; description: string }[] = [
  { value: "magical_warmers", label: "Magical Warmers", description: "Compresas terapéuticas de gel" },
  { value: "sweatspot", label: "Sweatspot", description: "Termos y accesorios deportivos" },
];

export interface InventoryNotification {
  id: string;
  type: "critico" | "bajo" | "pendiente" | "info";
  icon: React.ElementType;
  message: string;
  targetCategory: InventoryCategory | null;
  targetItemNames: string[];
}

interface BrandSelectionCardsProps {
  selectedBrand: InventoryBrand | null;
  onSelectBrand: (brand: InventoryBrand) => void;
  onNotificationClick?: (brand: InventoryBrand, notification: InventoryNotification) => void;
}

const BrandSelectionCards = ({ selectedBrand, onSelectBrand, onNotificationClick }: BrandSelectionCardsProps) => {
  const { stockItems, getStockStatus, productionRequirements, materialConfigs } = useInventoryStore();

  const getBrandNotifications = useMemo(() => {
    return (brand: InventoryBrand): InventoryNotification[] => {
      const items = stockItems.filter((i) => i.brand === brand);
      const notifications: InventoryNotification[] = [];

      const mpItems = items.filter((i) => i.category === "materia_prima");
      const mpCritical = mpItems.filter((i) => getStockStatus(i) === "critico");
      const mpLow = mpItems.filter((i) => getStockStatus(i) === "bajo");

      if (mpCritical.length > 0) {
        notifications.push({
          id: `${brand}-mp-crit`, type: "critico", icon: Beaker,
          message: `${mpCritical.length} materia${mpCritical.length > 1 ? "s" : ""} prima en nivel crítico: ${mpCritical.map((i) => i.name).join(", ")}`,
          targetCategory: "materia_prima", targetItemNames: mpCritical.map((i) => i.name),
        });
      }
      if (mpLow.length > 0) {
        notifications.push({
          id: `${brand}-mp-low`, type: "bajo", icon: Beaker,
          message: `${mpLow.length} materia${mpLow.length > 1 ? "s" : ""} prima con bajo stock: ${mpLow.map((i) => i.name).join(", ")}`,
          targetCategory: "materia_prima", targetItemNames: mpLow.map((i) => i.name),
        });
      }

      const bodyItems = items.filter((i) => i.category === "cuerpos_referencias");
      const bodyCritical = bodyItems.filter((i) => getStockStatus(i) === "critico");
      const bodyLow = bodyItems.filter((i) => getStockStatus(i) === "bajo");

      if (bodyCritical.length > 0) {
        notifications.push({
          id: `${brand}-body-crit`, type: "critico", icon: Box,
          message: `Falta de cuerpos: ${bodyCritical.map((i) => i.name).join(", ")} — sin stock para pedidos`,
          targetCategory: "cuerpos_referencias", targetItemNames: bodyCritical.map((i) => i.name),
        });
      }
      if (bodyLow.length > 0) {
        notifications.push({
          id: `${brand}-body-low`, type: "bajo", icon: Box,
          message: `Bajo stock de cuerpos: ${bodyLow.map((i) => i.name).join(", ")}`,
          targetCategory: "cuerpos_referencias", targetItemNames: bodyLow.map((i) => i.name),
        });
      }

      if (brand === "magical_warmers") {
        const gelItem = items.find((i) => i.category === "materia_prima" && i.name.toLowerCase().includes("gel"));
        if (gelItem) {
          const status = getStockStatus(gelItem);
          if (status === "critico") {
            notifications.push({
              id: `${brand}-gel-crit`, type: "critico", icon: Droplets,
              message: `Gel insuficiente: ${gelItem.available.toLocaleString("es-CO")} ${gelItem.unit} (mín: ${gelItem.minStock.toLocaleString("es-CO")})`,
              targetCategory: "materia_prima", targetItemNames: [gelItem.name],
            });
          } else if (status === "bajo") {
            notifications.push({
              id: `${brand}-gel-low`, type: "bajo", icon: Droplets,
              message: `Gel bajo: ${gelItem.available.toLocaleString("es-CO")} ${gelItem.unit} disponibles`,
              targetCategory: "materia_prima", targetItemNames: [gelItem.name],
            });
          }
        }
      }

      const ptItems = items.filter((i) => i.category === "producto_terminado");
      const ptCritical = ptItems.filter((i) => getStockStatus(i) === "critico");
      if (ptCritical.length > 0) {
        notifications.push({
          id: `${brand}-pt-crit`, type: "critico", icon: PackageCheck,
          message: `Producto terminado agotado: ${ptCritical.map((i) => i.name).join(", ")}`,
          targetCategory: "producto_terminado", targetItemNames: ptCritical.map((i) => i.name),
        });
      }

      const brandKey = brand === "magical_warmers" ? "magical" : "sweatspot";
      const pendingReqs = productionRequirements.filter((r) => r.brand === brandKey && r.status === "pendiente");
      if (pendingReqs.length > 0) {
        notifications.push({
          id: `${brand}-prod-pending`, type: "pendiente", icon: Clock,
          message: `${pendingReqs.length} pedido${pendingReqs.length > 1 ? "s" : ""} pendiente${pendingReqs.length > 1 ? "s" : ""} de producción`,
          targetCategory: null, targetItemNames: [],
        });
      }

      return notifications;
    };
  }, [stockItems, getStockStatus, productionRequirements, materialConfigs]);

  const getBrandStats = (brand: InventoryBrand) => {
    const items = stockItems.filter((i) => i.brand === brand);
    const critical = items.filter((i) => getStockStatus(i) === "critico").length;
    const low = items.filter((i) => getStockStatus(i) === "bajo").length;
    const totalItems = items.length;
    const brandKey = brand === "magical_warmers" ? "magical" : "sweatspot";
    const pending = productionRequirements.filter((r) => r.brand === brandKey && r.status === "pendiente").length;
    const inProgress = productionRequirements.filter((r) => r.brand === brandKey && r.status === "en_proceso").length;
    return { critical, low, totalItems, pending, inProgress };
  };

  const typeStyles: Record<InventoryNotification["type"], { bg: string; text: string; dot: string }> = {
    critico: { bg: "bg-destructive/10", text: "text-destructive", dot: "bg-destructive" },
    bajo: { bg: "bg-yellow-500/10", text: "text-yellow-700", dot: "bg-yellow-500" },
    pendiente: { bg: "bg-orange-500/10", text: "text-orange-700", dot: "bg-orange-500" },
    info: { bg: "bg-blue-500/10", text: "text-blue-700", dot: "bg-blue-500" },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {BRANDS.map((brand) => {
        const stats = getBrandStats(brand.value);
        const notifications = getBrandNotifications(brand.value);
        const isSelected = selectedBrand === brand.value;
        const hasCritical = stats.critical > 0;
        const totalAlerts = notifications.length;

        return (
          <Card
            key={brand.value}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg relative overflow-hidden ${
              isSelected ? "ring-2 ring-primary shadow-md" : "hover:ring-1 hover:ring-primary/30"
            }`}
            onClick={() => onSelectBrand(brand.value)}
          >
            <div className={`h-1.5 w-full ${hasCritical ? "bg-destructive" : stats.low > 0 ? "bg-yellow-500" : "bg-green-500"}`} />

            {totalAlerts > 0 && (
              <div className="absolute top-4 right-4 flex items-center gap-1.5">
                <Badge variant="destructive" className="text-xs font-bold px-2 py-1 gap-1 animate-pulse">
                  <Bell className="h-3 w-3" />
                  {totalAlerts}
                </Badge>
              </div>
            )}

            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{brand.label}</h3>
                  <p className="text-sm text-muted-foreground">{brand.description}</p>
                </div>
                <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${isSelected ? "rotate-90" : ""}`} />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className={`flex items-center gap-2 rounded-lg p-2.5 ${stats.critical > 0 ? "bg-destructive/10" : "bg-muted/50"}`}>
                  <AlertCircle className={`h-4 w-4 ${stats.critical > 0 ? "text-destructive" : "text-muted-foreground"}`} />
                  <div>
                    <p className={`text-lg font-bold leading-none ${stats.critical > 0 ? "text-destructive" : "text-muted-foreground"}`}>{stats.critical}</p>
                    <p className="text-[11px] text-muted-foreground">Críticos</p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 rounded-lg p-2.5 ${stats.low > 0 ? "bg-yellow-500/10" : "bg-muted/50"}`}>
                  <Clock className={`h-4 w-4 ${stats.low > 0 ? "text-yellow-600" : "text-muted-foreground"}`} />
                  <div>
                    <p className={`text-lg font-bold leading-none ${stats.low > 0 ? "text-yellow-600" : "text-muted-foreground"}`}>{stats.low}</p>
                    <p className="text-[11px] text-muted-foreground">Bajo stock</p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 rounded-lg p-2.5 ${stats.pending > 0 ? "bg-orange-500/10" : "bg-muted/50"}`}>
                  <Clock className={`h-4 w-4 ${stats.pending > 0 ? "text-orange-600" : "text-muted-foreground"}`} />
                  <div>
                    <p className={`text-lg font-bold leading-none ${stats.pending > 0 ? "text-orange-600" : "text-muted-foreground"}`}>{stats.pending}</p>
                    <p className="text-[11px] text-muted-foreground">Pendientes</p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 rounded-lg p-2.5 ${stats.inProgress > 0 ? "bg-blue-500/10" : "bg-muted/50"}`}>
                  <Loader2 className={`h-4 w-4 ${stats.inProgress > 0 ? "text-blue-600" : "text-muted-foreground"}`} />
                  <div>
                    <p className={`text-lg font-bold leading-none ${stats.inProgress > 0 ? "text-blue-600" : "text-muted-foreground"}`}>{stats.inProgress}</p>
                    <p className="text-[11px] text-muted-foreground">En curso</p>
                  </div>
                </div>
              </div>

              {notifications.length > 0 ? (
                <div className="space-y-1.5 border-t pt-3">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Bell className="h-3 w-3" /> Alertas activas
                  </p>
                  {notifications.slice(0, 4).map((n) => {
                    const style = typeStyles[n.type];
                    const Icon = n.icon;
                    const isClickable = n.targetCategory !== null && onNotificationClick;
                    return (
                      <div
                        key={n.id}
                        className={`flex items-start gap-2 rounded-md px-2.5 py-2 text-xs ${style.bg} ${isClickable ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
                        onClick={(e) => {
                          if (isClickable) {
                            e.stopPropagation();
                            onNotificationClick(brand.value, n);
                          }
                        }}
                      >
                        <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${style.dot}`} />
                        <Icon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${style.text}`} />
                        <span className={`${style.text} leading-snug`}>{n.message}</span>
                        {isClickable && <ChevronRight className={`h-3.5 w-3.5 shrink-0 mt-0.5 ml-auto ${style.text}`} />}
                      </div>
                    );
                  })}
                  {notifications.length > 4 && (
                    <p className="text-[11px] text-muted-foreground text-center">
                      +{notifications.length - 4} alerta{notifications.length - 4 > 1 ? "s" : ""} más
                    </p>
                  )}
                </div>
              ) : (
                <div className="border-t pt-3">
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Sin alertas — todo en orden
                  </span>
                </div>
              )}

              <div className="mt-2 flex items-center justify-end text-xs text-muted-foreground">
                {stats.totalItems} ítems registrados
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default BrandSelectionCards;
