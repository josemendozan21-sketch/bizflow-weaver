import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Check, X, Pencil, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { useInventoryStore, type StockItem, type StockStatus, type SweatspotProductCategory } from "@/stores/inventoryStore";
import { useInventory } from "@/hooks/useInventory";
import { toast } from "sonner";

const FILTER_OPTIONS: { value: SweatspotProductCategory | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "termos_150", label: "Termos 150 ml" },
  { value: "termos_250", label: "Termos 250 ml" },
  { value: "termos_500", label: "Termos 500 ml" },
  { value: "canguros", label: "Canguros" },
  { value: "chalecos", label: "Chalecos" },
];

const STATUS_CONFIG: Record<StockStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  ok: { label: "OK", variant: "secondary", icon: CheckCircle2 },
  bajo: { label: "Bajo stock", variant: "default", icon: AlertTriangle },
  critico: { label: "Crítico", variant: "destructive", icon: AlertCircle },
};

const SweatspotFinishedProducts = () => {
  const { stockItems, updateStockItem, getStockStatus } = useInventoryStore();
  const { updateStockItem: updateStockItemDb } = useInventory();
  const [activeFilter, setActiveFilter] = useState<SweatspotProductCategory | "todos">("todos");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ available: "", minStock: "" });

  const allItems = stockItems.filter(
    (i) => i.brand === "sweatspot" && i.category === "producto_terminado"
  );

  const filteredItems = activeFilter === "todos"
    ? allItems
    : allItems.filter((i) => i.sweatspotCategory === activeFilter);

  const startEdit = (item: StockItem) => {
    setEditingId(item.id);
    setEditForm({ available: String(item.available), minStock: String(item.minStock) });
  };

  const saveEdit = (id: string) => {
    updateStockItem(id, { available: Number(editForm.available), minStock: Number(editForm.minStock) });
    setEditingId(null);
    toast.success("Inventario actualizado");
  };

  // Group by logo
  const byLogo = filteredItems.reduce<Record<string, StockItem[]>>((acc, item) => {
    const logo = item.logo || "Sin logo";
    if (!acc[logo]) acc[logo] = [];
    acc[logo].push(item);
    return acc;
  }, {});

  const logoOrder = ["Sin logo", "Sweatspot"];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Producto Terminado — Sweatspot</CardTitle>
        <div className="flex flex-wrap gap-1.5 pt-2">
          {FILTER_OPTIONS.map((f) => {
            const count = f.value === "todos"
              ? allItems.length
              : allItems.filter((i) => i.sweatspotCategory === f.value).length;
            return (
              <Button
                key={f.value}
                size="sm"
                variant={activeFilter === f.value ? "default" : "outline"}
                onClick={() => setActiveFilter(f.value)}
                className="text-xs h-7"
              >
                {f.label} ({count})
              </Button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        {filteredItems.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            No hay productos en esta categoría.
          </p>
        ) : (
          <div className="space-y-6">
            {logoOrder.filter((l) => byLogo[l]).map((logoKey) => (
              <div key={logoKey} className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Logo: {logoKey}
                  <Badge variant="outline" className="text-[10px]">{byLogo[logoKey].length}</Badge>
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>Logo</TableHead>
                      <TableHead className="text-right">Disponible</TableHead>
                      <TableHead className="text-right">Mínimo</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byLogo[logoKey].map((item) => {
                      const status = getStockStatus(item);
                      const sc = STATUS_CONFIG[status];
                      const StatusIcon = sc.icon;
                      const isEditing = editingId === item.id;

                      return (
                        <TableRow
                          key={item.id}
                          className={
                            status === "critico" ? "bg-destructive/5" :
                            status === "bajo" ? "bg-primary/5" : ""
                          }
                        >
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.color || "—"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={item.logo === "Sweatspot" ? "default" : "outline"}
                              className="text-xs cursor-pointer hover:opacity-80"
                              onClick={async () => {
                                const newLogo = item.logo === "Sweatspot" ? null : "Sweatspot";
                                updateStockItem(item.id, { logo: newLogo } as any);
                                await updateStockItemDb(item.id, { logo: newLogo });
                                toast.success(`Logo cambiado a "${newLogo || "Sin logo"}"`);
                              }}
                            >
                              {item.logo || "Sin logo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {isEditing ? (
                              <Input type="number" min={0} value={editForm.available}
                                onChange={(e) => setEditForm({ ...editForm, available: e.target.value })}
                                className="h-7 w-20 ml-auto text-right" />
                            ) : (
                              <span className="font-semibold">{item.available}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {isEditing ? (
                              <Input type="number" min={0} value={editForm.minStock}
                                onChange={(e) => setEditForm({ ...editForm, minStock: e.target.value })}
                                className="h-7 w-20 ml-auto text-right" />
                            ) : (
                              <span>{item.minStock}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={sc.variant} className="text-xs gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {sc.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            {isEditing ? (
                              <>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(item.id)}>
                                  <Check className="h-4 w-4 text-primary" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                                  <X className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            ) : (
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(item)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SweatspotFinishedProducts;
