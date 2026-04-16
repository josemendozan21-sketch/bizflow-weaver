import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useCreateFeria } from "@/hooks/useFerias";

export function CreateFeriaDialog() {
  const [open, setOpen] = useState(false);
  const create = useCreateFeria();
  const [form, setForm] = useState({
    name: "",
    city: "",
    venue: "",
    start_date: "",
    end_date: "",
    stand_number: "",
    stand_size: "",
    stand_cost: "0",
    transport_cost: "0",
    lodging_cost: "0",
    other_costs: "0",
    assigned_staff: "",
    materials_needed: "",
    status: "planificada",
    notes: "",
  });

  const handleSubmit = async () => {
    if (!form.name || !form.city || !form.start_date || !form.end_date) return;
    await create.mutateAsync({
      name: form.name,
      city: form.city,
      venue: form.venue || null,
      start_date: form.start_date,
      end_date: form.end_date,
      stand_number: form.stand_number || null,
      stand_size: form.stand_size || null,
      stand_cost: parseFloat(form.stand_cost) || 0,
      transport_cost: parseFloat(form.transport_cost) || 0,
      lodging_cost: parseFloat(form.lodging_cost) || 0,
      other_costs: parseFloat(form.other_costs) || 0,
      assigned_staff: form.assigned_staff ? form.assigned_staff.split(",").map((s) => s.trim()).filter(Boolean) : null,
      materials_needed: form.materials_needed ? form.materials_needed.split(",").map((s) => s.trim()).filter(Boolean) : null,
      status: form.status,
      notes: form.notes || null,
    });
    setOpen(false);
    setForm({ ...form, name: "", city: "", venue: "", start_date: "", end_date: "", stand_number: "", stand_size: "", stand_cost: "0", transport_cost: "0", lodging_cost: "0", other_costs: "0", assigned_staff: "", materials_needed: "", notes: "" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" />Nueva feria</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nueva feria</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Ciudad *</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          </div>
          <div><Label>Lugar / Venue</Label><Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="Ej. Corferias" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Fecha inicio *</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><Label>Fecha fin *</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>N° Stand</Label><Input value={form.stand_number} onChange={(e) => setForm({ ...form, stand_number: e.target.value })} /></div>
            <div><Label>Tamaño stand</Label><Input value={form.stand_size} onChange={(e) => setForm({ ...form, stand_size: e.target.value })} placeholder="Ej. 3x3 m" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Costo stand</Label><Input type="number" value={form.stand_cost} onChange={(e) => setForm({ ...form, stand_cost: e.target.value })} /></div>
            <div><Label>Costo transporte</Label><Input type="number" value={form.transport_cost} onChange={(e) => setForm({ ...form, transport_cost: e.target.value })} /></div>
            <div><Label>Hospedaje</Label><Input type="number" value={form.lodging_cost} onChange={(e) => setForm({ ...form, lodging_cost: e.target.value })} /></div>
            <div><Label>Otros costos</Label><Input type="number" value={form.other_costs} onChange={(e) => setForm({ ...form, other_costs: e.target.value })} /></div>
          </div>
          <div><Label>Personal asignado (separado por comas)</Label><Input value={form.assigned_staff} onChange={(e) => setForm({ ...form, assigned_staff: e.target.value })} placeholder="Juan, Ana, Pedro" /></div>
          <div><Label>Materiales necesarios (separados por comas)</Label><Input value={form.materials_needed} onChange={(e) => setForm({ ...form, materials_needed: e.target.value })} placeholder="Carpa, mesa, displays" /></div>
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
          <Button onClick={handleSubmit} disabled={create.isPending}>Crear feria</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
