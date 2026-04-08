import { useInventoryStore, type ProductionRequirement } from "@/stores/inventoryStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";

const statusConfig: Record<ProductionRequirement["status"], { label: string; variant: "default" | "secondary" | "destructive"; icon: React.ReactNode }> = {
  pendiente: { label: "Pendiente", variant: "destructive", icon: <Clock className="h-3.5 w-3.5" /> },
  en_proceso: { label: "En proceso", variant: "default", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  completado: { label: "Completado", variant: "secondary", icon: <CheckCircle className="h-3.5 w-3.5" /> },
};

const ProductionRequirementsPanel = () => {
  const { productionRequirements, updateProductionRequirementStatus } = useInventoryStore();

  if (productionRequirements.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Requerimientos de producción generados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {productionRequirements.map((req) => {
            const cfg = statusConfig[req.status];
            return (
              <div key={req.id} className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{req.product}</span>
                    <Badge variant="outline" className="text-xs">{req.brand}</Badge>
                    <Badge variant={cfg.variant} className="gap-1 text-xs">
                      {cfg.icon} {cfg.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{req.reason}</p>
                  <p className="text-xs text-muted-foreground">Cantidad: {req.quantity} uds · Fecha: {req.createdAt}</p>
                </div>
                {req.status === "pendiente" && (
                  <Button size="sm" variant="outline" onClick={() => updateProductionRequirementStatus(req.id, "en_proceso")}>
                    Iniciar
                  </Button>
                )}
                {req.status === "en_proceso" && (
                  <Button size="sm" onClick={() => updateProductionRequirementStatus(req.id, "completado")}>
                    Completar
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductionRequirementsPanel;
