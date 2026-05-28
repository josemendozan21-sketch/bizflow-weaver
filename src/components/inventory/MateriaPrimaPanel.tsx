import { useMemo, useState } from "react";
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
  Beaker, Plus, Pencil, Check, X, AlertTriangle, AlertCircle, CheckCircle2, Search, ArrowDownAZ, ArrowUpAZ, Trash2,
} from "lucide-react";
import { useInventory, getStockStatus, type SupabaseStockItem } from "@/hooks/useInventory";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const UNITS = ["unidades", "gramos", "kilos", "tarros", "metros", "litros"];

const BRAND_LABEL: Record<string, string> = {
  magical: "Magical",
  sweatspot: "Sweatspot",
  ambas: "Ambas",
};

const BRAND_BADGE_CLASS: Record<string, string> = {
  magical: "bg-rose-100 text-rose-700 border-rose-200",
  sweatspot: "bg-sky-100 text-sky-700 border-sky-200",
  ambas: "bg-violet-100 text-violet-700 border-violet-200",
};

type BrandFilter = "todas" | "magical" | "sweatspot" | "ambas";

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const STATUS_CONFIG = {
  ok: { label: "OK", variant: "secondary" as const, icon: CheckCircle2 },
  bajo: { label: "Bajo stock", variant: "default" as const, icon: AlertTriangle },
  critico: { label: "Crítico", variant: "destructive" as const, icon: AlertCircle },
};

const MateriaPrimaPanel = () => {
  const { stockItems, addStockItem, updateStockItem, deleteStockItem } = useInventory();
  const { role } = useAuth();
  const isReadOnly = role === "asesor_comercial";

  const [brandFilter, setBrandFilter] = useState<BrandFilter>("todas");
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ available: "", minStock: "" });
  const [newForm, setNewForm] = useState({
    name: "", brand: "ambas", available: "", unit: "unidades", minStock: "",
  });

  const items = useMemo(() => {
    const q = normalize(search.trim());
    return stockItems
      .filter((i) => i.category === "materia_prima")
      .filter((i) => {
        if (brandFilter === "todas") return true;
        if (brandFilter === "ambas") return i.brand === "ambas";
        // Magical or Sweatspot filter: incluye items compartidos ("ambas")
        return i.brand === brandFilter || i.brand === "ambas";
      })
      .filter((i) => (q ? normalize(i.name).includes(q) : true))
      .sort((a, b) =>
        sortDir === "asc"
          ? a.name.localeCompare(b.name, "es", { sensitivity: "base" })
          : b.name.localeCompare(a.name, "es", { sensitivity: "base" })
      );
  }, [stockItems, brandFilter, search, sortDir]);

  const totals = useMemo(() => {
    const all = stockItems.filter((i) => i.category === "materia_prima");
    return {
      total: all.length,
      critico: all.filter((i) => getStockStatus(i) === "critico").length,
      bajo: all.filter((i) => getStockStatus(i) === "bajo").length,
    };
  }, [stockItems]);

  const handleAdd = async () => {
    if (!newForm.name || !newForm.available || !newForm.minStock) {
      toast.error("Completa nombre, cantidad y mínimo");
      return;
    }
    const res = await addStockItem({
      brand: newForm.brand,
      category: "materia_prima",
      name: newForm.name,
      available: Number(newForm.available),
      unit: newForm.unit,
      min_stock: Number(newForm.minStock),
    });
    if (res.success) {
      toast.success("Materia prima agregada");
      setNewForm({ name: "", brand: "ambas", available: "", unit: "unidades", minStock: "" });
      setAddOpen(false);
    } else {
      toast.error(res.message);
    }
  };

  const startEdit = (it: SupabaseStockItem) => {
    setEditingId(it.id);
    setEditForm({ available: String(it.available), minStock: String(it.min_stock) });
  };

  const saveEdit = async (id: string) => {
    const res = await updateStockItem(id, {
      available: Number(editForm.available),
      min_stock: Number(editForm.minStock),
    });
    if (res.success) {
      toast.success("Actualizado");
      setEditingId(null);
    } else toast.error(res.message);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"?`)) return;
    const res = await deleteStockItem(id);
    if (res.success) toast.success("Eliminado");
    else toast.error(res.message);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Beaker className="h-5 w-5 text-primary" />
            Materia Prima
            <Badge variant="outline" className="text-xs">{totals.total}</Badge>
            {totals.critico > 0 && <Badge variant="destructive" className="text-xs">{totals.critico} crítico{totals.critico > 1 ? "s" : ""}</Badge>}
            {totals.bajo > 0 && <Badge className="text-xs">{totals.bajo} bajo</Badge>}
          </CardTitle>
          {!isReadOnly && (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" />Agregar materia prima</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Nueva materia prima</DialogTitle>
                  <DialogDescription>
                    Indica para qué marca se usa. Usa "Ambas" para insumos compartidos (cinta, tintas, etc.).
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-1.5">
                    <Label>Nombre *</Label>
                    <Input placeholder="Ej: Cinta, Tinta negra, Gel..." value={newForm.name}
                      onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Marca *</Label>
                    <Select value={newForm.brand} onValueChange={(v) => setNewForm({ ...newForm, brand: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ambas">Ambas marcas</SelectItem>
                        <SelectItem value="magical">Magical</SelectItem>
                        <SelectItem value="sweatspot">Sweatspot</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="grid gap-1.5">
                      <Label>Cantidad *</Label>
                      <Input type="number" min={0} value={newForm.available}
                        onChange={(e) => setNewForm({ ...newForm, available: e.target.value })} />
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
                      <Input type="number" min={0} value={newForm.minStock}
                        onChange={(e) => setNewForm({ ...newForm, minStock: e.target.value })} />
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
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar materia prima..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
          </div>
          <Select value={brandFilter} onValueChange={(v) => setBrandFilter(v as BrandFilter)}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las marcas</SelectItem>
              <SelectItem value="magical">Magical</SelectItem>
              <SelectItem value="sweatspot">Sweatspot</SelectItem>
              <SelectItem value="ambas">Solo compartidas</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5"
            onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}>
            {sortDir === "asc" ? <ArrowDownAZ className="h-4 w-4" /> : <ArrowUpAZ className="h-4 w-4" />}
            {sortDir === "asc" ? "A-Z" : "Z-A"}
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No hay materia prima registrada con los filtros actuales.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Materia prima</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead className="text-right">Disponible</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                {!isReadOnly && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => {
                const status = getStockStatus(it);
                const sc = STATUS_CONFIG[status];
                const StatusIcon = sc.icon;
                const isEditing = editingId === it.id;
                const brandKey = (it.brand || "").toLowerCase();
                return (
                  <TableRow key={it.id} className={
                    status === "critico" ? "bg-destructive/5" : status === "bajo" ? "bg-primary/5" : ""
                  }>
                    <TableCell className="font-medium">{it.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${BRAND_BADGE_CLASS[brandKey] || ""}`}>
                        {BRAND_LABEL[brandKey] || it.brand}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <Input type="number" min={0} value={editForm.available}
                          onChange={(e) => setEditForm({ ...editForm, available: e.target.value })}
                          className="h-7 w-24 ml-auto text-right" />
                      ) : (
                        <span>
                          <span className="font-semibold">{it.available.toLocaleString("es-CO")}</span>
                          <span className="text-muted-foreground ml-1 text-xs">{it.unit}</span>
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
                          <span>{it.min_stock.toLocaleString("es-CO")}</span>
                          <span className="text-muted-foreground ml-1 text-xs">{it.unit}</span>
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
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(it.id)}>
                              <Check className="h-4 w-4 text-primary" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(it)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(it.id, it.name)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default MateriaPrimaPanel;