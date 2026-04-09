import { useState } from "react";
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
  Beaker, Box, PackageCheck, Layers, Plus, Pencil, Trash2, Check, X, AlertTriangle, AlertCircle, CheckCircle2,
} from "lucide-react";
import { useInventoryStore, type StockItem, type StockStatus, type InventoryCategory, type InventoryBrand } from "@/stores/inventoryStore";
import { toast } from "sonner";

const BRAND_OPTIONS: { value: InventoryBrand; label: string }[] = [
  { value: "sweatspot", label: "Sweatspot" },
  { value: "magical_warmers", label: "Magical Warmers" },
];

const CATEGORY_META: Record<InventoryCategory, { label: string; icon: React.ElementType }> = {
  materia_prima: { label: "Materia prima", icon: Beaker },
  producto_en_proceso: { label: "Producto en proceso", icon: Layers },
  cuerpos_referencias: { label: "Cuerpos o referencias", icon: Box },
  producto_terminado: { label: "Producto terminado", icon: PackageCheck },
};

const CATEGORIES: InventoryCategory[] = ["materia_prima", "producto_en_proceso", "cuerpos_referencias", "producto_terminado"];

const STATUS_CONFIG: Record<StockStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  ok: { label: "OK", variant: "secondary", icon: CheckCircle2 },
  bajo: { label: "Bajo stock", variant: "default", icon: AlertTriangle },
  critico: { label: "Crítico", variant: "destructive", icon: AlertCircle },
};

const UNITS = ["unidades", "gramos", "kilos", "tarros"];

interface CategorizedInventoryPanelProps {
  initialBrand?: InventoryBrand;
}

const CategorizedInventoryPanel = ({ initialBrand = "magical_warmers" }: CategorizedInventoryPanelProps) => {
  const { stockItems, addStockItem, updateStockItem, deleteStockItem, getStockStatus } = useInventoryStore();
  const [selectedBrand, setSelectedBrand] = useState<InventoryBrand>(initialBrand);
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory>("materia_prima");
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ available: "", minStock: "" });
  const [newForm, setNewForm] = useState({ name: "", available: "", unit: "unidades", minStock: "" });

  const filteredItems = stockItems.filter(
    (i) => i.brand === selectedBrand && i.category === selectedCategory
  );

  const handleAdd = () => {
    if (!newForm.name || !newForm.available || !newForm.minStock) {
      toast.error("Completa todos los campos");
      return;
    }
    addStockItem({
      brand: selectedBrand,
      category: selectedCategory,
      name: newForm.name,
      available: Number(newForm.available),
      unit: newForm.unit,
      minStock: Number(newForm.minStock),
    });
    toast.success("Ítem agregado al inventario");
    setNewForm({ name: "", available: "", unit: "unidades", minStock: "" });
    setAddOpen(false);
  };

  const startEdit = (item: StockItem) => {
    setEditingId(item.id);
    setEditForm({ available: String(item.available), minStock: String(item.minStock) });
  };

  const saveEdit = (id: string) => {
    updateStockItem(id, { available: Number(editForm.available), minStock: Number(editForm.minStock) });
    setEditingId(null);
    toast.success("Inventario actualizado");
  };

  const brandLabel = BRAND_OPTIONS.find((b) => b.value === selectedBrand)?.label ?? "";

  // Summary counts for brand
  const brandItems = stockItems.filter((i) => i.brand === selectedBrand);
  const totalCritical = brandItems.filter((i) => getStockStatus(i) === "critico").length;
  const totalLow = brandItems.filter((i) => getStockStatus(i) === "bajo").length;

  return (
    <div className="space-y-4">
      {/* Brand summary badges */}
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

      {/* Category tabs */}
      <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as InventoryCategory)}>
        <TabsList className="w-full grid grid-cols-4">
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
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {CATEGORY_META[cat].label} — {brandLabel}
                  </CardTitle>
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
                </div>
              </CardHeader>
              <CardContent>
                {filteredItems.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">
                    No hay ítems registrados en {CATEGORY_META[cat].label} para {brandLabel}.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Disponible</TableHead>
                        <TableHead className="text-right">Mínimo</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => {
                        const status = getStockStatus(item);
                        const sc = STATUS_CONFIG[status];
                        const StatusIcon = sc.icon;
                        const isEditing = editingId === item.id;

                        return (
                          <TableRow key={item.id} className={status === "critico" ? "bg-destructive/5" : status === "bajo" ? "bg-primary/5" : ""}>
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
                                  <span>{item.minStock.toLocaleString("es-CO")}</span>
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
                                <>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(item)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { deleteStockItem(item.id); toast.info("Ítem eliminado"); }}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default CategorizedInventoryPanel;
