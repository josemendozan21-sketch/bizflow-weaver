import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FeriaInventory, FeriaSale } from "@/hooks/useFerias";

export function FeriaInventoryStatus({
  inventory,
  sales,
}: {
  inventory: FeriaInventory[];
  sales: FeriaSale[];
}) {
  const rows = useMemo(() => {
    return inventory.map((it) => {
      const itemSales = sales.filter(
        (s) => s.brand === it.brand && s.product_name === it.product_name
      );
      const sold = itemSales.reduce((a, b) => a + b.quantity, 0);
      const revenue = itemSales.reduce((a, b) => a + Number(b.total_amount), 0);
      return {
        id: it.id,
        brand: it.brand,
        product_name: it.product_name,
        dispatched: it.quantity_dispatched,
        sold,
        available: it.quantity_dispatched - sold,
        revenue,
      };
    });
  }, [inventory, sales]);

  if (inventory.length === 0) {
    return (
      <Card className="p-10 text-center text-muted-foreground">
        No hay productos despachados aún.
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>Marca</TableHead>
            <TableHead className="text-right">Despachado</TableHead>
            <TableHead className="text-right">Vendido</TableHead>
            <TableHead className="text-right">Disponible</TableHead>
            <TableHead className="text-right">Ingreso</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.product_name}</TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize text-[10px]">{r.brand}</Badge>
              </TableCell>
              <TableCell className="text-right">{r.dispatched}</TableCell>
              <TableCell className="text-right">{r.sold}</TableCell>
              <TableCell className={`text-right font-semibold ${r.available === 0 ? "text-destructive" : r.available <= 3 ? "text-amber-600" : ""}`}>
                {r.available}
              </TableCell>
              <TableCell className="text-right">${r.revenue.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}