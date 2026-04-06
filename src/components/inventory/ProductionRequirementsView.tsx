import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, FlaskConical } from "lucide-react";
import { useProductionStore } from "@/stores/productionStore";
import { useInventoryStore } from "@/stores/inventoryStore";

export default function ProductionRequirementsView() {
  const fillingTasks = useProductionStore((s) => s.fillingTasks);
  const materialConfigs = useInventoryStore((s) => s.materialConfigs);
  const gelStock = useInventoryStore((s) => s.gelStock);

  const totalGelAvailable = gelStock.reduce((sum, s) => sum + s.availableGrams, 0);
  const activeTasks = fillingTasks.filter((t) => t.status !== "completado");

  const rows = activeTasks.map((task) => {
    const match = materialConfigs.find(
      (c) => c.productName.toLowerCase() === task.product.toLowerCase()
    );
    const gramsPerUnit = match?.gramsPerUnit ?? 60;
    const totalRequired = task.quantity * gramsPerUnit;
    const difference = totalGelAvailable - totalRequired;
    return {
      id: task.id,
      clientName: task.clientName,
      product: match?.productName ?? task.product,
      quantity: task.quantity,
      gramsPerUnit,
      totalRequired,
      gelAvailable: totalGelAvailable,
      difference,
      insufficient: difference < 0,
    };
  });

  const totalRequired = rows.reduce((s, r) => s + r.totalRequired, 0);
  const globalDifference = totalGelAvailable - totalRequired;
  const hasInsufficient = rows.some((r) => r.insufficient);

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Requerimientos de materia prima</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-6">
            No hay pedidos activos en producción que requieran materia prima.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Requerimientos de materia prima</CardTitle>
          </div>
          {hasInsufficient ? (
            <Badge variant="destructive">Con faltantes</Badge>
          ) : (
            <Badge variant="secondary">Sin faltantes</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido (Cliente)</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead className="text-right">Unidades</TableHead>
              <TableHead className="text-right">g/unidad</TableHead>
              <TableHead className="text-right">Gel requerido</TableHead>
              <TableHead className="text-right">Gel disponible</TableHead>
              <TableHead className="text-right">Diferencia</TableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.id}
                className={r.insufficient ? "bg-destructive/5" : ""}
              >
                <TableCell className="font-medium">{r.clientName}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{r.product}</Badge>
                </TableCell>
                <TableCell className="text-right">{r.quantity.toLocaleString("es-CO")}</TableCell>
                <TableCell className="text-right">{r.gramsPerUnit} g</TableCell>
                <TableCell className="text-right font-semibold">
                  {r.totalRequired.toLocaleString("es-CO")} g
                  <span className="block text-xs text-muted-foreground">
                    {(r.totalRequired / 1000).toFixed(2)} kg
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {r.gelAvailable.toLocaleString("es-CO")} g
                </TableCell>
                <TableCell
                  className={`text-right font-semibold ${
                    r.insufficient ? "text-destructive" : "text-primary"
                  }`}
                >
                  {r.insufficient ? "−" : "+"}
                  {Math.abs(r.difference).toLocaleString("es-CO")} g
                  <span className="block text-xs font-normal text-muted-foreground">
                    {(r.difference / 1000).toFixed(2)} kg
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  {r.insufficient ? (
                    <Badge variant="destructive" className="text-xs">Insuficiente</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Cubierto</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="rounded-md bg-muted/50 p-3 text-center">
            <p className="text-muted-foreground">Total gel requerido</p>
            <p className="text-lg font-bold text-foreground">
              {totalRequired.toLocaleString("es-CO")} g
            </p>
            <p className="text-xs text-muted-foreground">{(totalRequired / 1000).toFixed(2)} kg</p>
          </div>
          <div className="rounded-md bg-muted/50 p-3 text-center">
            <p className="text-muted-foreground">Gel disponible</p>
            <p className="text-lg font-bold text-foreground">
              {totalGelAvailable.toLocaleString("es-CO")} g
            </p>
            <p className="text-xs text-muted-foreground">{(totalGelAvailable / 1000).toFixed(2)} kg</p>
          </div>
          <div className="rounded-md bg-muted/50 p-3 text-center">
            <p className="text-muted-foreground">Balance global</p>
            <p
              className={`text-lg font-bold ${
                globalDifference < 0 ? "text-destructive" : "text-primary"
              }`}
            >
              {globalDifference < 0 ? "−" : "+"}
              {Math.abs(globalDifference).toLocaleString("es-CO")} g
            </p>
            <p className="text-xs text-muted-foreground">{(globalDifference / 1000).toFixed(2)} kg</p>
          </div>
        </div>

        {globalDifference < 0 ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Materia prima insuficiente</AlertTitle>
            <AlertDescription>
              Faltan <strong>{Math.abs(globalDifference).toLocaleString("es-CO")} g</strong> de gel
              para cubrir todos los pedidos activos. Solicite reabastecimiento.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Materia prima suficiente</AlertTitle>
            <AlertDescription>
              El inventario disponible cubre la demanda de todos los pedidos activos.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
