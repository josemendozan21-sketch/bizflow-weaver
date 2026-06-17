import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Check, X, Pencil, Sparkles } from "lucide-react";
import { useInventory, type SupabaseStockItem } from "@/hooks/useInventory";
import { toast } from "sonner";

type SweatCat = "termos_150" | "termos_250" | "termos_500" | "canguros" | "chalecos" | "accesorios";

const FILTER_OPTIONS: { value: SweatCat | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "termos_150", label: "Termos 150 ml" },
  { value: "termos_250", label: "Termos 250 ml" },
  { value: "termos_500", label: "Termos 500 ml" },
  { value: "canguros", label: "Canguros" },
  { value: "chalecos", label: "Chalecos" },
  { value: "accesorios", label: "Accesorios" },
];

interface Group {
  key: string;
  name: string;
  color: string | null;
  productType: string | null;
  sinLogo: SupabaseStockItem | null;
  conLogo: SupabaseStockItem | null;
}

interface SweatspotFinishedProductsProps {
  originFilter?: "todos" | "IMPORTADO" | "NACIONAL";
}

const SweatspotFinishedProducts = ({ originFilter = "todos" }: SweatspotFinishedProductsProps) => {
  const { stockItems, updateStockItem } = useInventory();
  const [activeFilter, setActiveFilter] = useState<SweatCat | "todos">("todos");
  const [onlySinLogo, setOnlySinLogo] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ available: "", minStock: "" });

  const allItems = useMemo(
    () => stockItems.filter((i) => i.brand === "sweatspot" && i.category === "producto_terminado"),
    [stockItems]
  );

  const itemsByOrigin = useMemo(
    () => (originFilter === "todos" ? allItems : allItems.filter((i) => i.product_type === originFilter)),
    [allItems, originFilter]
  );

  const filteredItems = useMemo(
    () =>
      activeFilter === "todos"
        ? itemsByOrigin
        : itemsByOrigin.filter((i) => i.sweatspot_category === activeFilter),
    [itemsByOrigin, activeFilter]
  );

  // Group by base name + color + product_type — yields one row per producto base with SIN/CON logo cells.
  const groups: Group[] = useMemo(() => {
    const map = new Map<string, Group>();
    for (const it of filteredItems) {
      const key = `${it.name.trim().toLowerCase()}|${(it.color || "").trim().toLowerCase()}|${it.product_type || ""}`;
      let g = map.get(key);
      if (!g) {
        g = {
          key,
          name: it.name.trim(),
          color: it.color,
          productType: it.product_type,
          sinLogo: null,
          conLogo: null,
        };
        map.set(key, g);
      }
      if (it.logo) g.conLogo = it; else g.sinLogo = it;
    }
    let arr = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "es"));
    if (onlySinLogo) arr = arr.filter((g) => g.sinLogo && g.sinLogo.available > 0);
    return arr;
  }, [filteredItems, onlySinLogo]);

  const totals = useMemo(() => {
    let sin = 0, con = 0;
    for (const g of groups) {
      sin += g.sinLogo?.available ?? 0;
      con += g.conLogo?.available ?? 0;
    }
    return { sin, con };
  }, [groups]);

  const startEdit = (item: SupabaseStockItem) => {
    setEditingId(item.id);
    setEditForm({ available: String(item.available), minStock: String(item.min_stock) });
  };

  const saveEdit = async (id: string) => {
    const res = await updateStockItem(id, {
      available: Number(editForm.available),
      min_stock: Number(editForm.minStock),
    });
    if (res.success) {
      toast.success("Inventario actualizado");
      setEditingId(null);
    } else {
      toast.error(res.message);
    }
  };

  const renderCell = (item: SupabaseStockItem | null, marcable: boolean) => {
    if (!item) {
      return <span className="text-xs text-muted-foreground">—</span>;
    }
    const isEditing = editingId === item.id;
    if (isEditing) {
      return (
        <div className="flex items-center justify-end gap-1">
          <Input
            type="number"
            min={0}
            value={editForm.available}
            onChange={(e) => setEditForm({ ...editForm, available: e.target.value })}
            className="h-7 w-16 text-right"
          />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(item.id)}>
            <Check className="h-4 w-4 text-primary" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
            <X className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-end gap-2">
        <span className={`font-semibold tabular-nums ${item.available === 0 ? "text-muted-foreground" : marcable ? "text-blue-700" : ""}`}>
          {item.available}
        </span>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEdit(item)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-base">Producto Terminado — Sweatspot</CardTitle>
            {originFilter !== "todos" && (
              <Badge variant="outline" className="text-xs">
                {originFilter === "IMPORTADO" ? "Importados" : "Producto Nacional"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <Label htmlFor="only-sin-logo" className="text-xs text-blue-900 cursor-pointer">
              Solo SIN LOGO (mayoristas con marcación)
            </Label>
            <Switch id="only-sin-logo" checked={onlySinLogo} onCheckedChange={setOnlySinLogo} />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-2">
          {FILTER_OPTIONS.map((f) => {
            const count = f.value === "todos"
              ? itemsByOrigin.length
              : itemsByOrigin.filter((i) => i.sweatspot_category === f.value).length;
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
        <div className="flex gap-4 pt-2 text-xs text-muted-foreground">
          <span>
            <Badge variant="outline" className="border-blue-300 text-blue-700 mr-1">SIN LOGO</Badge>
            Marcables (mayoristas): <b className="text-blue-700 tabular-nums">{totals.sin}</b> uds
          </span>
          {!onlySinLogo && (
            <span>
              <Badge variant="secondary" className="mr-1">CON LOGO</Badge>
              Ya marcado Sweatspot: <b className="tabular-nums">{totals.con}</b> uds
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            No hay productos en esta categoría.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead className="text-right text-blue-700">SIN LOGO<br/><span className="text-[10px] font-normal">(marcable)</span></TableHead>
                {!onlySinLogo && (
                  <TableHead className="text-right">CON LOGO<br/><span className="text-[10px] font-normal">(Sweatspot)</span></TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => (
                <TableRow key={g.key}>
                  <TableCell className="font-medium">{g.name}</TableCell>
                  <TableCell>{g.color || "—"}</TableCell>
                  <TableCell>
                    {g.productType ? (
                      <Badge variant="outline" className="text-[10px]">{g.productType}</Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right bg-blue-50/40">{renderCell(g.sinLogo, true)}</TableCell>
                  {!onlySinLogo && (
                    <TableCell className="text-right">{renderCell(g.conLogo, false)}</TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default SweatspotFinishedProducts;
