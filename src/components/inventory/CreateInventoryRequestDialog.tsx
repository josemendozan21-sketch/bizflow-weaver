import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PackageOpen } from "lucide-react";
import { useInventory } from "@/hooks/useInventory";
import { useInventoryRequests } from "@/hooks/useInventoryRequests";
import { toast } from "sonner";

interface Props {
  triggerLabel?: string;
  defaultBrand?: "magical" | "sweatspot";
  defaultCategory?: "cuerpos_referencias" | "producto_terminado";
}

const CreateInventoryRequestDialog = ({
  triggerLabel = "Solicitar a inventarios",
  defaultBrand = "magical",
  defaultCategory = "cuerpos_referencias",
}: Props) => {
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState<string>(defaultBrand);
  const [category, setCategory] = useState<string>(defaultCategory);
  const [itemId, setItemId] = useState<string>("");
  const [qty, setQty] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const { stockItems } = useInventory();
  const { createRequest } = useInventoryRequests();

  const items = useMemo(
    () => stockItems.filter((i) => i.brand === brand && i.category === category),
    [stockItems, brand, category],
  );

  const submit = async () => {
    const item = items.find((i) => i.id === itemId);
    const quantity = Number(qty);
    if (!item || !quantity || quantity <= 0) {
      toast.error("Selecciona la referencia y una cantidad válida");
      return;
    }
    setSubmitting(true);
    const res = await createRequest({
      brand,
      category: category as any,
      stock_item_id: item.id,
      item_name: item.name,
      quantity,
      reason: reason.trim() || undefined,
    });
    setSubmitting(false);
    if (!res.success) {
      toast.error(res.message);
      return;
    }
    toast.success("Solicitud enviada a inventarios");
    setItemId(""); setQty(""); setReason("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <PackageOpen className="h-4 w-4" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar entrega a inventarios</DialogTitle>
          <DialogDescription>
            Inventarios revisará y aprobará o rechazará tu solicitud. Al aprobar, el stock se descuenta automáticamente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Marca</Label>
              <Select value={brand} onValueChange={(v) => { setBrand(v); setItemId(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="magical">Magical Warmers</SelectItem>
                  <SelectItem value="sweatspot">Sweatspot</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoría</Label>
              <Select value={category} onValueChange={(v) => { setCategory(v); setItemId(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cuerpos_referencias">Cuerpos</SelectItem>
                  <SelectItem value="producto_terminado">Producto terminado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Referencia</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger><SelectValue placeholder="Selecciona una referencia" /></SelectTrigger>
              <SelectContent>
                {items.length === 0 ? (
                  <SelectItem value="__empty__" disabled>Sin referencias</SelectItem>
                ) : (
                  items.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}{c.product_type ? ` · ${c.product_type}` : ""} (stock: {c.available})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cantidad</Label>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div>
            <Label>Motivo (opcional)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="¿Para qué se necesita?" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={submitting}>Enviar solicitud</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateInventoryRequestDialog;