import { useState, useEffect, useRef } from "react";
import SweatspotFinishedProducts from "./SweatspotFinishedProducts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Beaker, Box, PackageCheck, Layers, Plus, Pencil, Trash2, Check, X, AlertTriangle, AlertCircle, CheckCircle2, Flame, Snowflake,
} from "lucide-react";
import { useInventory, getStockStatus, type SupabaseStockItem } from "@/hooks/useInventory";
import type { InventoryCategory, InventoryBrand } from "@/stores/inventoryStore";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type StockStatus = "ok" | "bajo" | "critico";

const BRAND_OPTIONS: { value: InventoryBrand; label: string }[] = [
  { value: "sweatspot", label: "Sweatspot" },
  { value: "magical_warmers", label: "Magical Warmers" },
];

const CATEGORY_META: Record<InventoryCategory, { label: string; icon: React.ElementType }> = {
  materia_prima: { label: "Materia Prima", icon: Beaker },
  producto_en_proceso: { label: "Producto en Proceso", icon: Layers },
  cuerpos_referencias: { label: "Cuerpos", icon: Box },
  producto_terminado: { label: "Producto Terminado", icon: PackageCheck },
};

const ALL_CATEGORIES: InventoryCategory[] = ["materia_prima", "producto_en_proceso", "cuerpos_referencias", "producto_terminado"];
const ASESOR_CATEGORIES: InventoryCategory[] = ["cuerpos_referencias", "producto_terminado"];

const STATUS_CONFIG: Record<StockStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  ok: { label: "OK", variant: "secondary", icon: CheckCircle2 },
  bajo: { label: "Bajo stock", variant: "default", icon: AlertTriangle },
  critico: { label: "Crítico", variant: "destructive", icon: AlertCircle },
};

const UNITS = ["unidades", "gramos", "kilos", "tarros"];

const BRAND_DB_MAP: Record<InventoryBrand, string> = {
  magical_warmers: "magical",
  sweatspot: "sweatspot",
};

const GROUPED_CATEGORIES: InventoryCategory[] = ["cuerpos_referencias", "producto_terminado"];

interface CategorizedInventoryPanelProps {
  initialBrand?: InventoryBrand;
  initialCategory?: InventoryCategory;
  highlightItemNames?: string[];
}

const CategorizedInventoryPanel = ({
  initialBrand = "magical_warmers",
  initialCategory = "materia_prima",
  highlightItemNames = [],
}: CategorizedInventoryPanelProps) => {
  const { stockItems, addStockItem, updateStockItem, deleteStockItem, isLoading } = useInventory();
  const { role } = useAuth();
  const isReadOnly = role === "asesor_comercial";
  const CATEGORIES = isReadOnly ? ASESOR_CATEGORIES : ALL_CATEGORIES;
  const effectiveInitialCategory = isReadOnly && !ASESOR_CATEGORIES.includes(initialCategory) ? "cuerpos_referencias" : initialCategory;
  const [selectedBrand] = useState<InventoryBrand>(initialBrand);
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory>(effectiveInitialCategory);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ available: "", minStock: "" });
  const [newForm, setNewForm] = useState({ name: "", available: "", unit: "unidades", minStock: "" });
  const [activeHighlights, setActiveHighlights] = useState<string[]>(highlightItemNames);
  const highlightRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (activeHighlights.length > 0 && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeHighlights, selectedCategory]);

  useEffect(() => {
    if (activeHighlights.length > 0) {
      const timer = setTimeout(() => setActiveHighlights([]), 4000);
      return () => clearTimeout(timer);
    }
  }, [activeHighlights]);

  const dbBrand = BRAND_DB_MAP[selectedBrand] || selectedBrand;

  const filteredItems = stockItems.filter(
    (i) => i.brand === dbBrand && i.category === selectedCategory
  );

  const handleAdd = async () => {
    if (!newForm.name || !newForm.available || !newForm.minStock) {
      toast.error("Completa todos los campos");
      return;
    }
    const result = await addStockItem({
      brand: dbBrand,
      category: selectedCategory,
      name: newForm.name,
      available: Number(newForm.available),
      unit: newForm.unit,
      min_stock: Number(newForm.minStock),
    });
    if (result.success) {
      toast.success("Ítem agregado al inventario");
      setNewForm({ name: "", available: "", unit: "unidades", minStock: "" });
      setAddOpen(false);
    } else {
      toast.error(result.message);
    }
  };

  const startEdit = (item: SupabaseStockItem) => {
    setEditingId(item.id);
    setEditForm({ available: String(item.available), minStock: String(item.min_stock) });
  };

  const saveEdit = async (id: string) => {
    const result = await updateStockItem(id, {
      available: Number(editForm.available),
      min_stock: Number(editForm.minStock),
    });
    if (result.success) {
      setEditingId(null);
      toast.success("Inventario actualizado");
    } else {
      toast.error(result.message);
    }
  };

  const brandLabel = BRAND_OPTIONS.find((b) => b.value === selectedBrand)?.label ?? "";

  const brandItems = stockItems.filter((i) => i.brand === selectedBrand);
  const totalCritical = brandItems.filter((i) => getStockStatus(i) === "critico").length;
  const totalLow = brandItems.filter((i) => getStockStatus(i) === "bajo").length;

  const isHighlighted = (itemName: string) => activeHighlights.includes(itemName);

  const isGroupedCategory = GROUPED_CATEGORIES.includes(selectedCategory);

  const renderItemRow = (item: SupabaseStockItem, idx: number, allItems: SupabaseStockItem[]) => {
    const status = getStockStatus(item);
    const sc = STATUS_CONFIG[status];
    const StatusIcon = sc.icon;
    const isEditing = editingId === item.id;
    const highlighted = isHighlighted(item.name);
    const isFirstHighlight = highlighted && allItems.findIndex((fi) => activeHighlights.includes(fi.name)) === idx;

    return (
      <TableRow
        key={item.id}
        ref={isFirstHighlight ? highlightRef : undefined}
        className={`transition-all duration-500 ${
          highlighted
            ? "ring-2 ring-primary ring-inset bg-primary/10 animate-pulse"
            : status === "critico"
            ? "bg-destructive/5"
            : status === "bajo"
            ? "bg-primary/5"
            : ""
        }`}
      >
        <TableCell className="font-medium">{item.name}</TableCell>
        <TableCell className="text-right">
          {isEditing ? (
            <Input type="number" min={0} value={editForm.available}
              onChange={(e) => setEditForm({ ...editForm, available: e.target.value })}
              className="h-7 w-24 ml-auto text-right" />
          ) : (
            <span>
              <span className="font-semibold">{item.available.toLocaleString("es-CO")}</span>
              <span className="text-muted-foreground ml-1 text-xs">{item.unit}</span>
            </span>
          )}
        </TableCell>
        <TableCell className="text-right">
          {isEditing ? (
            <Input type="number" min={0} value={editForm.minStock}
              onChange={(e) => setEditForm({ ...editForm, minStock: e.target.value })}
              className="h-7 w-24 ml-auto text-right" />
          ) : (
            <span>
              <span>{item.min_stock.toLocaleString("es-CO")}</span>
              <span className="text-muted-foreground ml-1 text-xs">{item.unit}</span>
            </span>
          )}
        </TableCell>
        <TableCell className="text-center">
          <Badge variant={sc.variant} className="text-xs gap-1">
            <StatusIcon className="h-3 w-3" />
            {sc.label}
          </Badge>
        </TableCell>
        {!isReadOnly && (
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
        )}
      </TableRow>
    );
  };

  const renderGroupedContent = (items: SupabaseStockItem[]) => {
    const termicos = items.filter((i) => i.product_type === "Térmico");
    const frios = items.filter((i) => i.product_type === "Frío");
    const otros = items.filter((i) => !i.product_type);

    const renderGroup = (groupItems: SupabaseStockItem[], label: string, icon: React.ElementType) => {
      const Icon = icon;
      if (groupItems.length === 0) return null;
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 pt-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-foreground">{label}</h4>
            <Badge variant="outline" className="text-[10px]">{groupItems.length}</Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Disponible</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                {!isReadOnly && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupItems.map((item, idx) => renderItemRow(item, idx, items))}
            </TableBody>
          </Table>
        </div>
      );
    };

    return (
      <div className="space-y-4">
        {renderGroup(termicos, "Productos Térmicos", Flame)}
        {renderGroup(frios, "Productos Fríos", Snowflake)}
        {otros.length > 0 && renderGroup(otros, "Otros", Box)}
      </div>
    );
  };

  const renderFlatContent = (items: SupabaseStockItem[]) => {
    if (items.length === 0) return null;
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead className="text-right">Disponible</TableHead>
            <TableHead className="text-right">Mínimo</TableHead>
            <TableHead className="text-center">Estado</TableHead>
            {!isReadOnly && <TableHead className="text-right">Acciones</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, idx) => renderItemRow(item, idx, items))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-lg font-semibold text-foreground">{brandLabel}</h2>
        <div className="ml-auto flex gap-1.5">
          {totalCritical > 0 && (
            <Badge variant="destructive" className="text-xs">{totalCritical} crítico{totalCritical > 1 ? "s" : ""}</Badge>
          )}
          {totalLow > 0 && (
            <Badge className="text-xs">{totalLow} bajo stock</Badge>
          )}
          {totalCritical === 0 && totalLow === 0 && (
            <Badge variant="secondary" className="text-xs">Todo OK</Badge>
          )}
        </div>
      </div>

      <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as InventoryCategory)}>
        <TabsList className={`w-full grid ${isReadOnly ? "grid-cols-2" : "grid-cols-4"}`}>
          {CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat];
            const Icon = meta.icon;
            const count = stockItems.filter((i) => i.brand === selectedBrand && i.category === cat).length;
            return (
              <TabsTrigger key={cat} value={cat} className="gap-1.5 text-xs sm:text-sm">
                <Icon className="h-4 w-4 hidden sm:block" />
                {meta.label}
                {count > 0 && <span className="text-muted-foreground">({count})</span>}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {CATEGORIES.map((cat) => (
          <TabsContent key={cat} value={cat}>
            {cat === "producto_terminado" && selectedBrand === "sweatspot" ? (
              <SweatspotFinishedProducts />
            ) : (
              <Card>
                <CardHeader className="pb-3">
                   <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {CATEGORY_META[cat].label} — {brandLabel}
                    </CardTitle>
                    {!isReadOnly && (
                      <Dialog open={addOpen} onOpenChange={setAddOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm"><Plus className="h-4 w-4 mr-1" />Agregar ítem</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Agregar ítem</DialogTitle>
                            <DialogDescription>
                              {brandLabel} → {CATEGORY_META[selectedCategory].label}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-2">
                            <div className="grid gap-1.5">
                              <Label>Nombre *</Label>
                              <Input placeholder="Ej: Gel, Envase…" value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="grid gap-1.5">
                                <Label>Cantidad *</Label>
                                <Input type="number" min={0} value={newForm.available} onChange={(e) => setNewForm({ ...newForm, available: e.target.value })} />
                              </div>
                              <div className="grid gap-1.5">
                                <Label>Unidad</Label>
                                <Select value={newForm.unit} onValueChange={(v) => setNewForm({ ...newForm, unit: v })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-1.5">
                                <Label>Mínimo *</Label>
                                <Input type="number" min={0} value={newForm.minStock} onChange={(e) => setNewForm({ ...newForm, minStock: e.target.value })} />
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
                            <Button onClick={handleAdd}>Guardar</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">Cargando inventario…</p>
                  ) : filteredItems.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      No hay ítems registrados en {CATEGORY_META[cat].label} para {brandLabel}.
                    </p>
                  ) : isGroupedCategory ? (
                    renderGroupedContent(filteredItems)
                  ) : (
                    renderFlatContent(filteredItems)
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default CategorizedInventoryPanel;
