import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Droplets, FlaskConical, CheckCircle } from "lucide-react";
import { useProductionStore } from "@/stores/productionStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import type { FillingTask } from "@/types/production";

interface GelRequirement {
  task: FillingTask;
  gramsPerUnit: number;
  totalGrams: number;
  productMatch: string | null;
}

export function GelRequirementsPanel() {
  const fillingTasks = useProductionStore((s) => s.fillingTasks);
  const materialConfigs = useInventoryStore((s) => s.materialConfigs);
  const gelStock = useInventoryStore((s) => s.gelStock);

  const activeTasks = fillingTasks.filter((t) => t.status !== "completado");
  const totalGelAvailable = gelStock.reduce((sum, s) => sum + s.availableGrams, 0);

  const requirements: GelRequirement[] = activeTasks.map((task) => {
    const match = materialConfigs.find(
      (c) => c.productName.toLowerCase() === task.product.toLowerCase()
    );
    const gramsPerUnit = match?.gramsPerUnit ?? 60;
    return {
      task,
      gramsPerUnit,
      totalGrams: task.quantity * gramsPerUnit,
      productMatch: match?.productName ?? null,
    };
  });

  const totalGelRequired = requirements.reduce((sum, r) => sum + r.totalGrams, 0);
  const isInsufficient = totalGelRequired > totalGelAvailable;

  if (activeTasks.length === 0) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Requerimiento de gel — Tareas activas</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Per-task breakdown */}
        <div className="space-y-2">
          {requirements.map((r) => (
            <div
              key={r.task.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">{r.task.clientName}</span>
                <Badge variant="secondary" className="text-xs">
                  {r.productMatch ?? r.task.product}
                </Badge>
              </div>
              <div className="text-right text-muted-foreground">
                {r.task.quantity} uds × {r.gramsPerUnit} g ={" "}
                <span className="font-semibold text-foreground">
                  {r.totalGrams.toLocaleString("es-CO")} g
                </span>
                <span className="ml-1 text-xs">
                  ({(r.totalGrams / 1000).toFixed(2)} kg)
                </span>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="rounded-md bg-muted/50 p-3 text-center">
            <p className="text-muted-foreground">Total requerido</p>
            <p className="text-lg font-bold text-foreground">
              {totalGelRequired.toLocaleString("es-CO")} g
            </p>
            <p className="text-xs text-muted-foreground">
              {(totalGelRequired / 1000).toFixed(2)} kg
            </p>
          </div>
          <div className="rounded-md bg-muted/50 p-3 text-center">
            <p className="text-muted-foreground">Inventario disponible</p>
            <p className="text-lg font-bold text-foreground">
              {totalGelAvailable.toLocaleString("es-CO")} g
            </p>
            <p className="text-xs text-muted-foreground">
              {(totalGelAvailable / 1000).toFixed(2)} kg
            </p>
          </div>
          <div className="rounded-md bg-muted/50 p-3 text-center">
            <p className="text-muted-foreground">Diferencia</p>
            <p
              className={`text-lg font-bold ${
                isInsufficient ? "text-destructive" : "text-primary"
              }`}
            >
              {isInsufficient ? "−" : "+"}
              {Math.abs(totalGelAvailable - totalGelRequired).toLocaleString("es-CO")} g
            </p>
            <p className="text-xs text-muted-foreground">
              {((totalGelAvailable - totalGelRequired) / 1000).toFixed(2)} kg
            </p>
          </div>
        </div>

        {/* Alert */}
        {isInsufficient ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Inventario insuficiente de gel</AlertTitle>
            <AlertDescription>
              Se necesitan{" "}
              <strong>{totalGelRequired.toLocaleString("es-CO")} g</strong> de gel
              pero solo hay{" "}
              <strong>{totalGelAvailable.toLocaleString("es-CO")} g</strong>{" "}
              disponibles. Faltan{" "}
              <strong>
                {(totalGelRequired - totalGelAvailable).toLocaleString("es-CO")} g
              </strong>{" "}
              ({((totalGelRequired - totalGelAvailable) / 1000).toFixed(2)} kg).
              Solicite reabastecimiento de materia prima.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Inventario suficiente</AlertTitle>
            <AlertDescription>
              El inventario disponible cubre la demanda actual de gel para las tareas de
              llenado activas.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
