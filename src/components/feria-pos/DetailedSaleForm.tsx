import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import type { FeriaInventory, FeriaSale } from "@/hooks/useFerias";
import { useAddFeriaSale } from "@/hooks/useFerias";

export function DetailedSaleForm({
  feriaId,
  inventory,
  sales,
}: {
  feriaId: string;
  inventory: FeriaInventory[];
  sales: FeriaSale[];
}) {
  const add = useAddFeriaSale();
  const [form, setForm] = useState({
    inventory_id: "",
    quantity: "1",
    unit_price: "",
    payment_method: "efectivo",
    client_name: "",
    notes: "",
  });

  const remainingMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const it of inventory) {
      const sold = sales
        .filter((s) => s.brand === it.brand && s.product_name === it.product_name)
        .reduce((a, b) => a + b.quantity, 0);
      map[it.id] = it.quantity_dispatched - sold;
    }
    return map;
  }, [inventory, sales]);

  const selected = inventory.find((i) => i.id === form.inventory_id);

  const handleSelect = (id: string) => {
    const it = inventory.find((i) => i.id === id);
    setForm({ ...form, inventory_id: id, unit_price: it ? String(it.unit_price) : "" });
  };

  const handleSubmit = async () => {
    if (!selected) return;
    const qty = parseInt(form.quantity, 10) || 0;
    const price = parseFloat(form.unit_price) || 0;
    if (qty <= 0) return;
    await add.mutateAsync({
      feria_id: feriaId,
      brand: selected.brand,
      product_name: selected.product_name,
      quantity: qty,
      unit_price: price,
      total_amount: qty * price,
      payment_method: form.payment_method,
      client_name: form.client_name || null,
      notes: form.notes || null,
    });
    setForm({ ...form, inventory_id: "", quantity: "1", unit_price: "", client_name: "", notes: "" });
  };

  return (
    <Card className="p-4 max-w-3xl">
      <h3 className="font-semibold mb-3">Registrar venta con detalle</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Producto</Label>
          <Select value={form.inventory_id} onValueChange={handleSelect}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>
              {inventory.map((it) => (
                <SelectItem key={it.id} value={it.id} disabled={remainingMap[it.id] <= 0}>
                  {it.product_name} ({it.brand}) — {remainingMap[it.id]} disp.
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Cantidad</Label>
          <Input type="number" min={1} max={selected ? remainingMap[selected.id] : undefined} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        </div>
        <div>
          <Label>Precio unitario</Label>
          <Input type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
        </div>
        <div>
          <Label>Pago</Label>
          <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="efectivo">Efectivo</SelectItem>
              <SelectItem value="transferencia">Transferencia</SelectItem>
              <SelectItem value="datafono">Datáfono</SelectItem>
              <SelectItem value="otro">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Cliente (opcional)</Label>
          <Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
        </div>
        <div>
          <Label>Notas</Label>
          <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={handleSubmit} disabled={!form.inventory_id || add.isPending}>
          <Plus className="mr-2 h-4 w-4" /> Registrar venta
        </Button>
      </div>
    </Card>
  );
}