import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DebouncedSearchInput from "@/components/inventory/DebouncedSearchInput";

const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

interface PosProduct {
  id: string;
  name: string;
  brand: string | null;
  sale_price: number;
  avg_cost: number;
  available: number;
  unit: string;
  active: boolean;
}

export default function Punto92WarehousePanel() {
  const [search, setSearch] = useState("");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["warehouse_punto92_products"],
    queryFn: async () => {
      const { data: loc } = await supabase
        .from("pos_locations")
        .select("id,name")
        .ilike("name", "%92%")
        .limit(1)
        .maybeSingle();
      if (!loc) return [] as PosProduct[];
      const { data, error } = await supabase
        .from("pos_products")
        .select("id,name,brand,sale_price,avg_cost,available,unit,active")
        .eq("location_id", (loc as any).id)
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as PosProduct[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.brand ?? "").toLowerCase().includes(q),
    );
  }, [products, search]);

  const totals = useMemo(() => {
    const units = filtered.reduce((a, p) => a + Number(p.available), 0);
    const value = filtered.reduce((a, p) => a + Number(p.available) * Number(p.avg_cost), 0);
    return { units, value, count: filtered.length };
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Referencias</p>
          <p className="text-lg font-semibold">{totals.count}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Unidades</p>
          <p className="text-lg font-semibold">{totals.units.toLocaleString("es-CO")}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Valor inventario (costo)</p>
          <p className="text-lg font-semibold">{fmt(totals.value)}</p>
        </Card>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Productos del Punto de la 92</h3>
          <Badge variant="outline" className="text-[10px]">Solo lectura</Badge>
        </div>
        <DebouncedSearchInput value={search} onChange={setSearch} placeholder="Buscar por producto o marca…" />

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Cargando…</p>
        ) : (
          <div className="max-h-[560px] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead className="text-right">Existencias</TableHead>
                  <TableHead className="text-right">Precio venta</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                      Sin productos
                    </TableCell>
                  </TableRow>
                ) : filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs">{p.name}</TableCell>
                    <TableCell className="text-xs capitalize">{p.brand ?? "—"}</TableCell>
                    <TableCell className="text-right text-xs font-medium">{Number(p.available).toLocaleString("es-CO")}</TableCell>
                    <TableCell className="text-right text-xs">{fmt(Number(p.sale_price))}</TableCell>
                    <TableCell className="text-right text-xs">{fmt(Number(p.available) * Number(p.avg_cost))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}