import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Customer, SPORT_OPTIONS, useCreateCustomer } from "@/hooks/useCustomers";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDocument?: string;
  initialPhone?: string;
  onCreated?: (customer: Customer) => void;
};

export function CreateCustomerDialog({ open, onOpenChange, initialDocument, initialPhone, onCreated }: Props) {
  const create = useCreateCustomer();
  const [form, setForm] = useState({
    document: "",
    full_name: "",
    phone: "",
    email: "",
    city: "",
    address: "",
    sport: "",
  });

  useEffect(() => {
    if (open) {
      setForm((f) => ({
        ...f,
        document: initialDocument ?? f.document,
        phone: initialPhone ?? f.phone,
      }));
    }
  }, [open, initialDocument, initialPhone]);

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    try {
      const c = await create.mutateAsync({ ...form, sport: form.sport || undefined });
      toast.success("Cliente creado");
      onCreated?.(c);
      onOpenChange(false);
      setForm({ document: "", full_name: "", phone: "", email: "", city: "", address: "", sport: "" });
    } catch (e: any) {
      toast.error(e.message ?? "Error al crear cliente");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear cliente</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Nombre completo *</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} autoFocus />
          </div>
          <div>
            <Label>Cédula / NIT</Label>
            <Input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Ciudad</Label>
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Dirección</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Deporte principal</Label>
            <Select value={form.sport} onValueChange={(v) => setForm({ ...form, sport: v })}>
              <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
              <SelectContent>
                {SPORT_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={create.isPending}>{create.isPending ? "Guardando…" : "Crear cliente"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}