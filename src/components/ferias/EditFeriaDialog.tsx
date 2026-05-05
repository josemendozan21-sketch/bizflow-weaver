import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Plus, X } from "lucide-react";
import { useUpdateFeria, type Feria } from "@/hooks/useFerias";

const PREDEFINED_MATERIALS = [
  "Malla exhibición", "Rack para banners", "Banners", "Mesa", "Sillas", "Ganchos",
  "Tijeras", "Cintas", "Tablas para anotar", "Datáfonos", "Carpa", "Displays",
  "Iluminación", "Extensiones eléctricas", "Bolsas de empaque", "Etiquetas de precio",
];

const COST_FIELDS: Array<{ key: keyof Feria; label: string }> = [
  { key: "stand_cost", label: "Costo Feria" },
  { key: "shipping_cost", label: "Envío Mercancía" },
  { key: "tickets_cost", label: "Tiquetes" },
  { key: "advertising_cost", label: "Publicidad" },
  { key: "merchandise_cost", label: "Costo de Mercancía" },
  { key: "employees_cost", label: "Empleados" },
  { key: "lodging_cost", label: "Viáticos: Hospedaje" },
  { key: "transport_cost", label: "Viáticos: Transporte" },
  { key: "food_cost", label: "Viáticos: Alimentación" },
  { key: "other_costs", label: "Otros costos" },
];

export function EditFeriaDialog({ feria }: { feria: Feria }) {
  const [open, setOpen] = useState(false);
  const update = useUpdateFeria();
  const [form, setForm] = useState<any>({});
  const [customMaterial, setCustomMaterial] = useState("");

  useEffect(() => {
    if (open) {
      setForm({
        name: feria.name, city: feria.city, venue: feria.venue || "",
        start_date: feria.start_date, end_date: feria.end_date, setup_date: feria.setup_date || "",
        stand_number: feria.stand_number || "", stand_size: feria.stand_size || "",
        stand_cost: String(feria.stand_cost || 0),
        shipping_cost: String(feria.shipping_cost || 0),
        tickets_cost: String(feria.tickets_cost || 0),
        advertising_cost: String(feria.advertising_cost || 0),
        merchandise_cost: String(feria.merchandise_cost || 0),
        employees_cost: String(feria.employees_cost || 0),
        lodging_cost: String(feria.lodging_cost || 0),
        transport_cost: String(feria.transport_cost || 0),
        food_cost: String(feria.food_cost || 0),
        other_costs: String(feria.other_costs || 0),
        materials_needed: feria.materials_needed || [],
        status: feria.status,
        notes: feria.notes || "",
      });
    }
  }, [open, feria]);

  const toggleMaterial = (m: string) => {
    setForm((p: any) => ({
      ...p,
      materials_needed: p.materials_needed.includes(m)
        ? p.materials_needed.filter((x: string) => x !== m)
        : [...p.materials_needed, m],
    }));
  };

  const addCustomMaterial = () => {
    const v = customMaterial.trim();
    if (!v || form.materials_needed.includes(v)) return;
    setForm({ ...form, materials_needed: [...form.materials_needed, v] });
    setCustomMaterial("");
  };

  const totalCosts = COST_FIELDS.reduce((s, f) => s + (parseFloat(form[f.key]) || 0), 0);

  const handleSubmit = async () => {
    await update.mutateAsync({
      id: feria.id,
      name: form.name, city: form.city, venue: form.venue || null,
      start_date: form.start_date, end_date: form.end_date,
      setup_date: form.setup_date || null,
      stand_number: form.stand_number || null, stand_size: form.stand_size || null,
      stand_cost: parseFloat(form.stand_cost) || 0,
      shipping_cost: parseFloat(form.shipping_cost) || 0,
      tickets_cost: parseFloat(form.tickets_cost) || 0,
      advertising_cost: parseFloat(form.advertising_cost) || 0,
      merchandise_cost: parseFloat(form.merchandise_cost) || 0,
      employees_cost: parseFloat(form.employees_cost) || 0,
      lodging_cost: parseFloat(form.lodging_cost) || 0,
      transport_cost: parseFloat(form.transport_cost) || 0,
      food_cost: parseFloat(form.food_cost) || 0,
      other_costs: parseFloat(form.other_costs) || 0,
      materials_needed: form.materials_needed.length > 0 ? form.materials_needed : null,
      status: form.status,
      notes: form.notes || null,
    });
    setOpen(false);
  };

  if (!form.name) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm"><Pencil className="mr-2 h-4 w-4" />Editar feria</Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar feria</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Pencil className="mr-2 h-4 w-4" />Editar feria</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar feria</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Ciudad *</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          </div>
          <div><Label>Lugar / Venue</Label><Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Fecha montaje</Label><Input type="date" value={form.setup_date} onChange={(e) => setForm({ ...form, setup_date: e.target.value })} /></div>
            <div><Label>Fecha inicio *</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><Label>Fecha fin *</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>N° Stand</Label><Input value={form.stand_number} onChange={(e) => setForm({ ...form, stand_number: e.target.value })} /></div>
            <div><Label>Tamaño stand</Label><Input value={form.stand_size} onChange={(e) => setForm({ ...form, stand_size: e.target.value })} /></div>
          </div>

          <div className="border rounded-lg p-3 bg-muted/30">
            <h4 className="font-semibold mb-3 text-sm">Costos de la feria</h4>
            <div className="grid grid-cols-2 gap-3">
              {COST_FIELDS.map((f) => (
                <div key={f.key as string}>
                  <Label className="text-xs">{f.label}</Label>
                  <Input type="number" value={form[f.key as string]} onChange={(e) => setForm({ ...form, [f.key as string]: e.target.value })} />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-3 pt-3 border-t font-semibold">
              <span>Costo Total</span>
              <span>${totalCosts.toLocaleString()}</span>
            </div>
          </div>

          <div className="border rounded-lg p-3 bg-muted/30">
            <h4 className="font-semibold mb-3 text-sm">Materiales / estructuras</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PREDEFINED_MATERIALS.map((m) => {
                const checked = form.materials_needed.includes(m);
                return (
                  <label key={m} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-background/60 rounded px-2 py-1">
                    <Checkbox checked={checked} onCheckedChange={() => toggleMaterial(m)} />
                    <span>{m}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex gap-2 mt-3">
              <Input value={customMaterial} onChange={(e) => setCustomMaterial(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomMaterial(); } }}
                placeholder="Agregar otro material/estructura..." className="text-sm" />
              <Button type="button" variant="outline" size="sm" onClick={addCustomMaterial}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {form.materials_needed.filter((m: string) => !PREDEFINED_MATERIALS.includes(m)).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.materials_needed.filter((m: string) => !PREDEFINED_MATERIALS.includes(m)).map((m: string) => (
                  <span key={m} className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    {m}
                    <button type="button" onClick={() => toggleMaterial(m)}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>Estado</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="planificada">Planificada</SelectItem>
                <SelectItem value="en_curso">En curso</SelectItem>
                <SelectItem value="finalizada">Finalizada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Notas</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={update.isPending}>Guardar cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}