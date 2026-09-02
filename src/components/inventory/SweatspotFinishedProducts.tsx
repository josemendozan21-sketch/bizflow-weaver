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
import { Check, X, Pencil, Sparkles, Plus, Trash2, TextCursorInput, Tag } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useInventory, type SupabaseStockItem } from "@/hooks/useInventory";
import { useAuth } from "@/contexts/AuthContext";
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
  const { stockItems, updateStockItem, addStockItem, deleteStockItem } = useInventory();
  const { role } = useAuth();
  // Solo Admin e Inventarios pueden crear/editar/eliminar referencias.
  const canManage = role === "admin" || role === "inventarios";
  const [addOpen, setAddOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    name: "",
    color: "",
    origen: "NACIONAL" as "NACIONAL" | "IMPORTADO",
    categoria: "termos_250" as SweatCat,
    logo: "sin" as "sin" | "con",
    available: "",
    minStock: "0",
  });
  const [activeFilter, setActiveFilter] = useState<SweatCat | "todos">("todos");
  const [onlySinLogo, setOnlySinLogo] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ available: "", minStock: "" });
  const [markGroup, setMarkGroup] = useState<Group | null>(null);
  const [markQty, setMarkQty] = useState("");

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

  const searchedItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filteredItems;
    return filteredItems.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.color || "").toLowerCase().includes(q) ||
        (i.product_type || "").toLowerCase().includes(q)
    );
  }, [filteredItems, searchQuery]);

  // Group by base name + color + product_type — yields one row per producto base with SIN/CON logo cells.
  const groups: Group[] = useMemo(() => {
    const map = new Map<string, Group>();
    for (const it of searchedItems) {
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
  }, [searchedItems, onlySinLogo]);

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

  const handleAdd = async () => {
    if (!newForm.name.trim() || newForm.available === "") {
      toast.error("Completa nombre y unidades disponibles");
      return;
    }
    const res = await addStockItem({
      brand: "sweatspot",
      category: "producto_terminado",
      name: newForm.name.trim(),
      available: Number(newForm.available),
      unit: "unidades",
      min_stock: Number(newForm.minStock || 0),
      product_type: newForm.origen,
      color: newForm.color.trim() || null,
      logo: newForm.logo === "con" ? "Sweatspot" : null,
      sweatspot_category: newForm.categoria,
    });
    if (!res.success) {
      toast.error(res.message);
      return;
    }
    toast.success("Referencia creada");
    setNewForm({ name: "", color: "", origen: "NACIONAL", categoria: "termos_250", logo: "sin", available: "", minStock: "0" });
    setAddOpen(false);
  };

  const handleRename = async (item: SupabaseStockItem) => {
    const next = window.prompt("Nuevo nombre de la referencia:", item.name);
    if (!next || !next.trim() || next.trim() === item.name) return;
    const res = await updateStockItem(item.id, { name: next.trim() });
    if (res.success) toast.success("Referencia renombrada");
    else toast.error(res.message);
  };

  const handleDelete = async (item: SupabaseStockItem) => {
    if (!window.confirm(`¿Eliminar la referencia "${item.name}"? Esta acción no se puede deshacer.`)) return;
    const res = await deleteStockItem(item.id);
    if (res.success) toast.success("Referencia eliminada");
    else toast.error(res.message);
  };


  const createVariant = async (g: Group, marcado: boolean) => {
    const base = marcado ? g.sinLogo : g.conLogo;
    if (!base) return null;
    const res = await addStockItem({
      brand: "sweatspot",
      category: "producto_terminado",
      name: base.name,
      available: 0,
      unit: base.unit || "unidades",
      min_stock: base.min_stock || 0,
      product_type: base.product_type,
      color: base.color,
      logo: marcado ? "Sweatspot" : null,
      sweatspot_category: (base as any).sweatspot_category,
    } as any);
    if (!res.success) {
      toast.error(res.message);
      return null;
    }
    return res;
  };

  const handleMark = async () => {
    if (!markGroup || !markGroup.sinLogo) return;
    const qty = Number(markQty);
    if (!qty || qty <= 0) {
      toast.error("Indica una cantidad válida");
      return;
    }
    if (qty > markGroup.sinLogo.available) {
      toast.error(`Solo hay ${markGroup.sinLogo.available} uds sin marcar`);
      return;
    }
    let target = markGroup.conLogo;
    if (!target) {
      const created = await createVariant(markGroup, true);
      if (!created) return;
      target = (created as any).data ?? null;
    }
    const sinRes = await updateStockItem(markGroup.sinLogo.id, { available: markGroup.sinLogo.available - qty });
    if (!sinRes.success) { toast.error(sinRes.message); return; }
    if (target) {
      const conRes = await updateStockItem(target.id, { available: (target.available || 0) + qty });
      if (!conRes.success) { toast.error(conRes.message); return; }
    }
    toast.success(`${qty} uds marcadas con logo`);
    setMarkGroup(null);
    setMarkQty("");
  };

  const renderCell = (item: SupabaseStockItem | null, marcable: boolean, group?: Group) => {
    if (!item) {
      if (canManage && group) {
        return (
          <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => createVariant(group, !marcable)}>
            <Plus className="h-3 w-3 mr-1" />Crear
          </Button>
        );
      }
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
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(item.id)} title="Guardar cambios" aria-label={`Guardar cambios de ${item.name}`}>
            <Check className="h-4 w-4 text-primary" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)} title="Cancelar edición" aria-label={`Cancelar edición de ${item.name}`}>
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
        {canManage && (
          <>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEdit(item)} title="Editar existencias" aria-label={`Editar existencias de ${item.name}`}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRename(item)} title="Renombrar referencia" aria-label={`Renombrar ${item.name}`}>
              <TextCursorInput className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDelete(item)} title="Eliminar referencia" aria-label={`Eliminar ${item.name}`}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </>
        )}
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
          <div className="flex items-center gap-2 flex-wrap">
          {canManage && (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" />Agregar referencia</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Agregar referencia — Sweatspot</DialogTitle>
                  <DialogDescription>Producto terminado de Sweatspot</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                  <div className="grid gap-1.5">
                    <Label>Nombre *</Label>
                    <Input value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} placeholder="Ej: BIB SPOT" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Color</Label>
                    <Input value={newForm.color} onChange={(e) => setNewForm({ ...newForm, color: e.target.value })} placeholder="Ej: Morado" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label>Origen</Label>
                      <Select value={newForm.origen} onValueChange={(v) => setNewForm({ ...newForm, origen: v as "NACIONAL" | "IMPORTADO" })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NACIONAL">Nacional</SelectItem>
                          <SelectItem value="IMPORTADO">Importado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Categoría</Label>
                      <Select value={newForm.categoria} onValueChange={(v) => setNewForm({ ...newForm, categoria: v as SweatCat })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FILTER_OPTIONS.filter((f) => f.value !== "todos").map((f) => (
                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="grid gap-1.5">
                      <Label>Logo</Label>
                      <Select value={newForm.logo} onValueChange={(v) => setNewForm({ ...newForm, logo: v as "sin" | "con" })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sin">Sin logo</SelectItem>
                          <SelectItem value="con">Con logo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Disponible *</Label>
                      <Input type="number" min={0} value={newForm.available} onChange={(e) => setNewForm({ ...newForm, available: e.target.value })} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Mínimo</Label>
                      <Input type="number" min={0} value={newForm.minStock} onChange={(e) => setNewForm({ ...newForm, minStock: e.target.value })} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAdd}>Guardar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <Label htmlFor="only-sin-logo" className="text-xs text-blue-900 cursor-pointer">
              Solo SIN LOGO (mayoristas con marcación)
            </Label>
            <Switch id="only-sin-logo" checked={onlySinLogo} onCheckedChange={setOnlySinLogo} />
          </div>
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
        <div className="pt-2">
          <Input
            placeholder="Buscar por nombre, color u origen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-sm max-w-md"
          />
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
                {canManage && <TableHead className="text-right">Marcación</TableHead>}
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
                  <TableCell className="text-right bg-blue-50/40">{renderCell(g.sinLogo, true, g)}</TableCell>
                  {!onlySinLogo && (
                    <TableCell className="text-right">{renderCell(g.conLogo, false, g)}</TableCell>
                  )}
                  {canManage && (
                    <TableCell className="text-right">
                      {g.sinLogo && g.sinLogo.available > 0 && (
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => { setMarkGroup(g); setMarkQty(""); }}>
                          <Tag className="h-3 w-3 mr-1" />Marcar
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!markGroup} onOpenChange={(o) => { if (!o) { setMarkGroup(null); setMarkQty(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Marcar unidades</DialogTitle>
            <DialogDescription>
              {markGroup ? `${markGroup.name}${markGroup.color ? ` — ${markGroup.color}` : ""} · disponibles sin marcar: ${markGroup.sinLogo?.available ?? 0}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5 py-2">
            <Label>Cantidad a marcar</Label>
            <Input type="number" min={1} value={markQty} onChange={(e) => setMarkQty(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkGroup(null)}>Cancelar</Button>
            <Button onClick={handleMark}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SweatspotFinishedProducts;
