import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { useInventoryStore } from "@/stores/inventoryStore";

const TYPE_LABELS: Record<string, string> = {
  materia_prima: "Materia prima",
  cuerpos_referencias: "Cuerpos / referencias",
  producto_terminado: "Producto terminado",
};

const BRAND_LABELS: Record<string, string> = {
  sweatspot: "Sweatspot",
  magical: "Magical Warmers",
};

const InventoryTotalsPanel = () => {
  const totals = useInventoryStore((s) => s.inventoryTotals);

  if (totals.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Resumen de inventario acumulado</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Referencia</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Total acumulado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {totals.map((t, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{t.product}</TableCell>
                <TableCell>
                  <Badge variant={t.brand === "magical" ? "default" : "secondary"} className="text-xs">
                    {BRAND_LABELS[t.brand] ?? t.brand}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{TYPE_LABELS[t.inventoryType] ?? t.inventoryType}</TableCell>
                <TableCell className="text-right font-semibold">
                  {t.totalQuantity.toLocaleString("es-CO")} {t.unit}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default InventoryTotalsPanel;
