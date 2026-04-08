import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useInventoryStore, type MaterialConfig } from "@/stores/inventoryStore";

interface LowStockItem {
  config: MaterialConfig;
  type: "body" | "finished";
  current: number;
  min: number;
  deficit: number;
}

export const BodyProductionSection = () => {
  const { materialConfigs, productionRequirements, addProductionRequirement, updateProductionRequirementStatus } = useInventoryStore();
  const generatedRef = useRef<Set<string>>(new Set());

  // Detect items below minimum
  const lowStockItems: LowStockItem[] = [];
  for (const c of materialConfigs) {
    if (c.minBodyUnits > 0 && c.bodyUnits <= c.minBodyUnits) {
      lowStockItems.push({ config: c, type: "body", current: c.bodyUnits, min: c.minBodyUnits, deficit: c.minBodyUnits - c.bodyUnits });
    }
    if (c.minFinishedUnits > 0 && c.finishedUnits <= c.minFinishedUnits) {
      lowStockItems.push({ config: c, type: "finished", current: c.finishedUnits, min: c.minFinishedUnits, deficit: c.minFinishedUnits - c.finishedUnits });
    }
  }

  // Auto-generate production requirements for low stock
  useEffect(() => {
    for (const item of lowStockItems) {
      const key = `${item.config.id}-${item.type}`;
      if (generatedRef.current.has(key)) continue;

      const alreadyExists = productionRequirements.some(
        (r) =>
          r.product === `${item.config.productName} (${item.config.productType})` &&
          r.reason.includes(item.type === "body" ? "Cuerpos" : "Terminado") &&
          r.status !== "completado"
      );

      if (!alreadyExists) {
        addProductionRequirement({
          brand: "magical",
          product: `${item.config.productName} (${item.config.productType})`,
          quantity: item.deficit,
          reason: `${item.type === "body" ? "Cuerpos" : "Terminado"} por debajo del mínimo. Actual: ${item.current}, mín: ${item.min}.`,
        });
        generatedRef.current.add(key);
      }
    }
  }, [lowStockItems.length]);

  // Filter production requirements relevant to this section
  const bodyRequirements = productionRequirements.filter(
    (r) => r.brand === "magical" && (r.reason.includes("Cuerpos") || r.reason.includes("Terminado"))
  );

  const statusBadge = (status: string) => {
    switch (status) {
      case "pendiente": return <Badge variant="destructive">Pendiente</Badge>;
      case "en_proceso": return <Badge variant="secondary">En proceso</Badge>;
      case "completado": return <Badge variant="outline" className="border-green-600 text-green-700">Completado</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Alerts panel */}
      {lowStockItems.length > 0 && (
        <Card className="border-orange-300 bg-orange-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              Alertas de stock mínimo ({lowStockItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {lowStockItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm border rounded-md px-3 py-2 bg-background">
                  <div className="flex items-center gap-2">
                    <Badge variant={item.config.productType === "Frío" ? "default" : "secondary"}>
                      {item.config.productType}
                    </Badge>
                    <span className="font-medium">{item.config.productName}</span>
                    <span className="text-muted-foreground">
                      — {item.type === "body" ? "Cuerpos" : "Terminado"}
                    </span>
                  </div>
                  <div className="text-orange-700 font-semibold">
                    {item.current} / {item.min} uds (faltan {item.deficit})
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {lowStockItems.length === 0 && bodyRequirements.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mb-2 text-green-500" />
          <p>Todos los productos están por encima del stock mínimo.</p>
          <p className="text-sm">Configura mínimos en Inventarios → Configuración de productos.</p>
        </div>
      )}

      {/* Production orders table */}
      {bodyRequirements.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Órdenes de producción generadas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bodyRequirements.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.product}</TableCell>
                    <TableCell>{req.quantity} uds</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{req.reason}</TableCell>
                    <TableCell>{req.createdAt}</TableCell>
                    <TableCell>{statusBadge(req.status)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {req.status === "pendiente" && (
                        <Button size="sm" variant="outline" onClick={() => updateProductionRequirementStatus(req.id, "en_proceso")}>
                          <Loader2 className="h-3 w-3 mr-1" /> Iniciar
                        </Button>
                      )}
                      {req.status === "en_proceso" && (
                        <Button size="sm" variant="outline" onClick={() => updateProductionRequirementStatus(req.id, "completado")}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Completar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
