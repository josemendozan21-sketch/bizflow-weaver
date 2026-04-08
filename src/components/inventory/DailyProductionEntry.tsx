import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, ClipboardList, Trash2 } from "lucide-react";
import { useInventoryStore, type DailyProductionEntry as EntryType } from "@/stores/inventoryStore";
import { toast } from "sonner";

const AREAS = [
  { value: "cuerpos", label: "Producción de cuerpos" },
  { value: "llenado", label: "Producción de llenado" },
  { value: "terminado", label: "Producción de producto terminado" },
];

const BRANDS = [
  { value: "sweatspot", label: "Sweatspot" },
  { value: "magical", label: "Magical Warmers" },
];

const INVENTORY_TYPES = [
  { value: "materia_prima", label: "Materia prima" },
  { value: "cuerpos_referencias", label: "Cuerpos o referencias" },
  { value: "producto_terminado", label: "Producto terminado" },
];

const UNITS = [
  { value: "unidades", label: "Unidades" },
  { value: "gramos", label: "Gramos" },
  { value: "kilos", label: "Kilos" },
];

const INITIAL_FORM = {
  fecha: new Date().toISOString().slice(0, 10),
  area: "",
  brand: "",
  inventoryType: "",
  product: "",
  quantity: "",
  unit: "",
  observaciones: "",
};

const DailyProductionEntry = () => {
  const { dailyEntries, addDailyEntry, deleteDailyEntry } = useInventoryStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  const handleSubmit = () => {
    if (!form.area || !form.brand || !form.inventoryType || !form.product || !form.quantity || !form.unit) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }

    addDailyEntry({
      fecha: form.fecha,
      area: form.area as EntryType["area"],
      brand: form.brand as EntryType["brand"],
      inventoryType: form.inventoryType as EntryType["inventoryType"],
      product: form.product,
      quantity: Number(form.quantity),
      unit: form.unit as EntryType["unit"],
      observaciones: form.observaciones || undefined,
    });

    toast.success("Registro guardado e inventario actualizado");
    setForm(INITIAL_FORM);
    setOpen(false);
  };

  const areaLabel = (v: string) => AREAS.find((a) => a.value === v)?.label ?? v;
  const brandLabel = (v: string) => BRANDS.find((b) => b.value === v)?.label ?? v;
  const typeLabel = (v: string) => INVENTORY_TYPES.find((t) => t.value === v)?.label ?? v;
  const unitLabel = (v: string) => UNITS.find((u) => u.value === v)?.label ?? v;

  const sorted = [...dailyEntries].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Registro diario de producción</CardTitle>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nuevo registro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar producción diaria</DialogTitle>
              <DialogDescription>
                Ingresa los datos de producción del día. El inventario se actualizará automáticamente.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              {/* Fecha */}
              <div className="grid gap-1.5">
                <Label htmlFor="fecha">Fecha *</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                />
              </div>

              {/* Área + Marca */}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Área *</Label>
                  <Select value={form.area} onValueChange={(v) => setForm({ ...form, area: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {AREAS.map((a) => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Marca *</Label>
                  <Select value={form.brand} onValueChange={(v) => setForm({ ...form, brand: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {BRANDS.map((b) => (
                        <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tipo de inventario */}
              <div className="grid gap-1.5">
                <Label>Tipo de inventario *</Label>
                <Select value={form.inventoryType} onValueChange={(v) => setForm({ ...form, inventoryType: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                  <SelectContent>
                    {INVENTORY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Referencia / Producto */}
              <div className="grid gap-1.5">
                <Label htmlFor="product">Referencia o producto *</Label>
                <Input
                  id="product"
                  placeholder="Ej: Muela, Cuello, Gel terapéutico…"
                  value={form.product}
                  onChange={(e) => setForm({ ...form, product: e.target.value })}
                />
              </div>

              {/* Cantidad + Unidad */}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="qty">Cantidad *</Label>
                  <Input
                    id="qty"
                    type="number"
                    min={1}
                    placeholder="0"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Unidad de medida *</Label>
                  <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Observaciones */}
              <div className="grid gap-1.5">
                <Label htmlFor="obs">Observaciones</Label>
                <Textarea
                  id="obs"
                  placeholder="Notas opcionales…"
                  value={form.observaciones}
                  onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                  className="min-h-[60px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit}>Guardar registro</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No hay registros de producción. Usa "Nuevo registro" para comenzar.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead>Observaciones</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap">{entry.fecha}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs whitespace-nowrap">{areaLabel(entry.area)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.brand === "magical" ? "default" : "secondary"} className="text-xs">
                        {brandLabel(entry.brand)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{typeLabel(entry.inventoryType)}</TableCell>
                    <TableCell className="font-medium">{entry.product}</TableCell>
                    <TableCell className="text-right font-semibold whitespace-nowrap">
                      {entry.quantity.toLocaleString("es-CO")} {unitLabel(entry.unit)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                      {entry.observaciones || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          deleteDailyEntry(entry.id);
                          toast.info("Registro eliminado");
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DailyProductionEntry;
