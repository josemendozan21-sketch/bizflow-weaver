import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, Loader2, CheckCircle2, ChevronRight } from "lucide-react";
import { useInventoryStore, type InventoryBrand } from "@/stores/inventoryStore";

const BRANDS: { value: InventoryBrand; label: string; description: string }[] = [
  { value: "magical_warmers", label: "Magical Warmers", description: "Compresas terapéuticas de gel" },
  { value: "sweatspot", label: "Sweatspot", description: "Termos y accesorios deportivos" },
];

interface BrandSelectionCardsProps {
  selectedBrand: InventoryBrand | null;
  onSelectBrand: (brand: InventoryBrand) => void;
}

const BrandSelectionCards = ({ selectedBrand, onSelectBrand }: BrandSelectionCardsProps) => {
  const { stockItems, getStockStatus, productionRequirements } = useInventoryStore();

  const getBrandStats = (brand: InventoryBrand) => {
    const items = stockItems.filter((i) => i.brand === brand);
    const critical = items.filter((i) => getStockStatus(i) === "critico").length;
    const low = items.filter((i) => getStockStatus(i) === "bajo").length;
    const ok = items.filter((i) => getStockStatus(i) === "ok").length;
    const totalItems = items.length;

    const brandKey = brand === "magical_warmers" ? "magical" : "sweatspot";
    const pending = productionRequirements.filter((r) => r.brand === brandKey && r.status === "pendiente").length;
    const inProgress = productionRequirements.filter((r) => r.brand === brandKey && r.status === "en_proceso").length;

    return { critical, low, ok, totalItems, pending, inProgress };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {BRANDS.map((brand) => {
        const stats = getBrandStats(brand.value);
        const isSelected = selectedBrand === brand.value;
        const hasCritical = stats.critical > 0;

        return (
          <Card
            key={brand.value}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg relative overflow-hidden ${
              isSelected
                ? "ring-2 ring-primary shadow-md"
                : "hover:ring-1 hover:ring-primary/30"
            }`}
            onClick={() => onSelectBrand(brand.value)}
          >
            {/* Top accent bar */}
            <div
              className={`h-1.5 w-full ${
                hasCritical
                  ? "bg-destructive"
                  : stats.low > 0
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
            />

            {/* Notification badge */}
            {(stats.critical > 0 || stats.pending > 0) && (
              <div className="absolute top-4 right-4">
                <Badge variant="destructive" className="text-xs font-bold px-2 py-1 animate-pulse">
                  {stats.critical + stats.pending}
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

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Critical */}
                <div className={`flex items-center gap-2 rounded-lg p-2.5 ${stats.critical > 0 ? "bg-destructive/10" : "bg-muted/50"}`}>
                  <AlertCircle className={`h-4 w-4 ${stats.critical > 0 ? "text-destructive" : "text-muted-foreground"}`} />
                  <div>
                    <p className={`text-lg font-bold leading-none ${stats.critical > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {stats.critical}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Críticos</p>
                  </div>
                </div>

                {/* Low stock */}
                <div className={`flex items-center gap-2 rounded-lg p-2.5 ${stats.low > 0 ? "bg-yellow-500/10" : "bg-muted/50"}`}>
                  <Clock className={`h-4 w-4 ${stats.low > 0 ? "text-yellow-600" : "text-muted-foreground"}`} />
                  <div>
                    <p className={`text-lg font-bold leading-none ${stats.low > 0 ? "text-yellow-600" : "text-muted-foreground"}`}>
                      {stats.low}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Bajo stock</p>
                  </div>
                </div>

                {/* Pending production */}
                <div className={`flex items-center gap-2 rounded-lg p-2.5 ${stats.pending > 0 ? "bg-orange-500/10" : "bg-muted/50"}`}>
                  <Clock className={`h-4 w-4 ${stats.pending > 0 ? "text-orange-600" : "text-muted-foreground"}`} />
                  <div>
                    <p className={`text-lg font-bold leading-none ${stats.pending > 0 ? "text-orange-600" : "text-muted-foreground"}`}>
                      {stats.pending}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Pendientes</p>
                  </div>
                </div>

                {/* In progress */}
                <div className={`flex items-center gap-2 rounded-lg p-2.5 ${stats.inProgress > 0 ? "bg-blue-500/10" : "bg-muted/50"}`}>
                  <Loader2 className={`h-4 w-4 ${stats.inProgress > 0 ? "text-blue-600" : "text-muted-foreground"}`} />
                  <div>
                    <p className={`text-lg font-bold leading-none ${stats.inProgress > 0 ? "text-blue-600" : "text-muted-foreground"}`}>
                      {stats.inProgress}
                    </p>
                    <p className="text-[11px] text-muted-foreground">En curso</p>
                  </div>
                </div>
              </div>

              {/* Overall status indicator */}
              <div className="mt-3 flex items-center gap-2 text-xs">
                {stats.critical > 0 ? (
                  <span className="flex items-center gap-1 text-destructive font-medium">
                    <AlertCircle className="h-3.5 w-3.5" /> Requiere atención inmediata
                  </span>
                ) : stats.low > 0 ? (
                  <span className="flex items-center gap-1 text-yellow-600 font-medium">
                    <Clock className="h-3.5 w-3.5" /> Revisar niveles de stock
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-green-600 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Todo en orden
                  </span>
                )}
                <span className="ml-auto text-muted-foreground">{stats.totalItems} ítems</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default BrandSelectionCards;
