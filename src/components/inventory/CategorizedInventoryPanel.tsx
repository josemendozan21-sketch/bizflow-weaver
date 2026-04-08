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
import {
  Beaker, Box, PackageCheck, Plus, Pencil, Trash2, Check, X, AlertTriangle, AlertCircle, CheckCircle2,
} from "lucide-react";
import { useInventoryStore, type StockItem, type StockStatus } from "@/stores/inventoryStore";
import { toast } from "sonner";

const CATEGORY_META: Record<StockItem["category"], { label: string; description: string; icon: React.ElementType }> = {
  materia_prima: { label: "Materia prima", description: "Gel, mezclas, rollos plásticos, tintas, silicona", icon: Beaker },
  cuerpos_referencias: { label: "Cuerpos o referencias", description: "Envases o estructuras listas para llenar", icon: Box },
  producto_terminado: { label: "Productos terminados", description: "Listos para despacho", icon: PackageCheck },
};

const STATUS_CONFIG: Record<StockStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  ok: { label: "OK", variant: "secondary", icon: CheckCircle2 },
  bajo: { label: "Bajo stock", variant: "default", icon: AlertTriangle },
  critico: { label: "Crítico", variant: "destructive", icon: AlertCircle },
};

const CATEGORIES: StockItem["category"][] = ["materia_prima", "cuerpos_referencias", "producto_terminado"];

const UNITS = ["unidades", "gramos", "kilos"];

const CategorizedInventoryPanel = () => {
  const { stockItems, addStockItem, updateStockItem, deleteStockItem, getStockStatus } = useInventoryStore();
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ available: "", minStock: "" });
  const [newForm, setNewForm] = useState({ category: "" as string, name: "", available: "", unit: "unidades", minStock: "" });

  const handleAdd = () => {
    if (!newForm.category || !newForm.name || !newForm.available || !newForm.minStock) {
      toast.error("Completa todos los campos");
      return;
    }
    addStockItem({
      category: newForm.category as StockItem["category"],
      name: newForm.name,
      available: Number(newForm.available),
      unit: newForm.unit,
      minStock: Number(newForm.minStock),
    });
    toast.success("Ítem agregado al inventario");
    setNewForm({ category: "", name: "", available: "", unit: "unidades", minStock: "" });
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Inventario por categoría</h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Agregar ítem</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Agregar ítem al inventario</DialogTitle>
              <DialogDescription>Registra un nuevo material, cuerpo o producto terminado.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-1.5">
                <Label>Categoría *</Label>
                <Select value={newForm.category} onValueChange={(v) => setNewForm({ ...newForm, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{CATEGORY_META[c].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Nombre *</Label>
                <Input placeholder="Ej: Gel, Envase Muela…" value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1.5">
                  <Label>Cantidad *</Label>
                  <Input type="number" min={0} value={newForm.available} onChange={(e) => setNewForm({ ...newForm, available: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Unidad *</Label>
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

      {CATEGORIES.map((cat) => {
        const meta = CATEGORY_META[cat];
        const Icon = meta.icon;
        const items = stockItems.filter((i) => i.category === cat);
        const criticalCount = items.filter((i) => getStockStatus(i) === "critico").length;
        const lowCount = items.filter((i) => getStockStatus(i) === "bajo").length;

        return (
          <Card key={cat}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">{meta.label}</CardTitle>
                    <p className="text-xs text-muted-foreground">{meta.description}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {criticalCount > 0 && (
                    <Badge variant="destructive" className="text-xs">{criticalCount} crítico{criticalCount > 1 ? "s" : ""}</Badge>
                  )}
                  {lowCount > 0 && (
                    <Badge className="text-xs">{lowCount} bajo stock</Badge>
                  )}
                  {criticalCount === 0 && lowCount === 0 && (
                    <Badge variant="secondary" className="text-xs">Todo OK</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">No hay ítems registrados en esta categoría.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ítem</TableHead>
                      <TableHead className="text-right">Disponible</TableHead>
                      <TableHead className="text-right">Mínimo</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const status = getStockStatus(item);
                      const sc = STATUS_CONFIG[status];
                      const StatusIcon = sc.icon;
                      const isEditing = editingId === item.id;

                      return (
                        <TableRow key={item.id} className={status === "critico" ? "bg-destructive/5" : status === "bajo" ? "bg-primary/5" : ""}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-right">
                            {isEditing ? (
                              <Input
                                type="number" min={0} value={editForm.available}
                                onChange={(e) => setEditForm({ ...editForm, available: e.target.value })}
                                className="h-7 w-24 ml-auto text-right"
                              />
                            ) : (
                              <span>
                                <span className="font-semibold">{item.available.toLocaleString("es-CO")}</span>
                                <span className="text-muted-foreground ml-1 text-xs">{item.unit}</span>
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {isEditing ? (
                              <Input
                                type="number" min={0} value={editForm.minStock}
                                onChange={(e) => setEditForm({ ...editForm, minStock: e.target.value })}
                                className="h-7 w-24 ml-auto text-right"
                              />
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
        );
      })}
    </div>
  );
};

export default CategorizedInventoryPanel;
