import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export interface InventoryItem {
  reference: string;
  brand: "sweatspot" | "magical";
  stock: number;
  minStock: number;
}

interface InventoryQuickViewProps {
  items: InventoryItem[];
}

export function InventoryQuickView({ items }: InventoryQuickViewProps) {
  const sweatspotItems = items.filter((i) => i.brand === "sweatspot");
  const magicalItems = items.filter((i) => i.brand === "magical");
  const criticalItems = items.filter((i) => i.stock <= i.minStock);

  const totalSweatspot = sweatspotItems.reduce((s, i) => s + i.stock, 0);
  const totalMagical = magicalItems.reduce((s, i) => s + i.stock, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Inventario rápido</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">Sweatspot</p>
            <p className="text-xl font-bold text-blue-600">{totalSweatspot}</p>
            <p className="text-[10px] text-muted-foreground">unidades</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">Magical Warmers</p>
            <p className="text-xl font-bold text-violet-600">{totalMagical}</p>
            <p className="text-[10px] text-muted-foreground">unidades</p>
          </div>
        </div>

        {criticalItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-destructive flex items-center gap-1">
              Referencias críticas
              <Badge variant="destructive" className="text-[10px] ml-1">{criticalItems.length}</Badge>
            </p>
            {criticalItems.map((item) => {
              const pct = Math.min((item.stock / item.minStock) * 100, 100);
              return (
                <div key={item.reference} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground font-medium">{item.reference}</span>
                    <span className="text-muted-foreground">
                      {item.stock}/{item.minStock}
                    </span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </div>
        )}

        {criticalItems.length === 0 && (
          <p className="text-xs text-muted-foreground">No hay referencias en nivel crítico.</p>
        )}
      </CardContent>
    </Card>
  );
}
