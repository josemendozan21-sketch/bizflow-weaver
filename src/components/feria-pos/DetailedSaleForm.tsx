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
    client_email: "",
    client_doc: "",
    discount: "",
    notes: "",
  });
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [payment2, setPayment2] = useState("tarjeta");
  const [amount2, setAmount2] = useState("");

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

  const qtyNum = parseInt(form.quantity, 10) || 0;
  const priceNum = parseFloat(form.unit_price) || 0;
  const discountNum = Math.max(0, parseFloat(form.discount) || 0);
  const subtotal = qtyNum * priceNum;
  const totalCalc = Math.max(0, subtotal - discountNum);
  const amount2Num = Math.max(0, parseFloat(amount2) || 0);
  const amount1Calc = Math.max(0, totalCalc - amount2Num);

  const handleSelect = (id: string) => {
    const it = inventory.find((i) => i.id === id);
    setForm({ ...form, inventory_id: id, unit_price: it ? String(it.unit_price) : "" });
  };

  const handleSubmit = async () => {
    if (!selected) return;
    const qty = qtyNum;
    const price = priceNum;
    const discount = discountNum;
    if (qty <= 0) return;
    const total = totalCalc;
    const noteParts: string[] = [];
    if (form.client_email) noteParts.push(`Email: ${form.client_email}`);
    if (form.client_doc) noteParts.push(`Doc: ${form.client_doc}`);
    if (discount > 0) noteParts.push(`Desc: $${discount.toLocaleString()}`);
    if (splitEnabled && amount2Num > 0) {
      noteParts.push(`Pago mixto: ${form.payment_method} $${amount1Calc.toLocaleString()} + ${payment2} $${amount2Num.toLocaleString()}`);
    }
    if (form.notes) noteParts.push(form.notes);
    const baseNote = noteParts.join(" | ") || null;
    if (splitEnabled && amount2Num > 0 && amount2Num < total) {
      // Split into two sale records, prorating quantity
      const qty2 = Math.max(1, Math.round((qty * amount2Num) / total));
      const qty1 = Math.max(0, qty - qty2);
      if (qty1 > 0) {
        await add.mutateAsync({
          feria_id: feriaId,
          brand: selected.brand,
          product_name: selected.product_name,
          quantity: qty1,
          unit_price: price,
          total_amount: amount1Calc,
          payment_method: form.payment_method,
          client_name: form.client_name || null,
          notes: baseNote,
        });
      }
      await add.mutateAsync({
        feria_id: feriaId,
        brand: selected.brand,
        product_name: selected.product_name,
        quantity: qty2,
        unit_price: price,
        total_amount: amount2Num,
        payment_method: payment2,
        client_name: form.client_name || null,
        notes: baseNote,
      });
    } else {
      await add.mutateAsync({
        feria_id: feriaId,
        brand: selected.brand,
        product_name: selected.product_name,
        quantity: qty,
        unit_price: price,
        total_amount: total,
        payment_method: form.payment_method,
        client_name: form.client_name || null,
        notes: baseNote,
      });
    }
    setForm({ ...form, inventory_id: "", quantity: "1", unit_price: "", client_name: "", client_email: "", client_doc: "", discount: "", notes: "" });
    setSplitEnabled(false);
    setAmount2("");
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
              <SelectItem value="tarjeta">Tarjeta</SelectItem>
              <SelectItem value="nequi">Nequi</SelectItem>
              <SelectItem value="transferencia">Transferencia</SelectItem>
              <SelectItem value="otro">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Nombre cliente (opcional)</Label>
          <Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
        </div>
        <div>
          <Label>Email (opcional)</Label>
          <Input type="email" value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} />
        </div>
        <div>
          <Label>Cédula / NIT (opcional)</Label>
          <Input value={form.client_doc} onChange={(e) => setForm({ ...form, client_doc: e.target.value })} />
        </div>
        <div>
          <Label>Descuento ($)</Label>
          <Input type="number" min={0} value={form.discount} placeholder="0" onChange={(e) => setForm({ ...form, discount: e.target.value })} />
        </div>
        <div>
          <Label>Notas</Label>
          <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>
      <div className="mt-4 rounded-lg border bg-muted/40 p-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal ({qtyNum} × ${priceNum.toLocaleString()})</span>
          <span className="font-medium">${subtotal.toLocaleString()}</span>
        </div>
        {discountNum > 0 && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Descuento</span>
            <span>− ${discountNum.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-semibold border-t pt-2">
          <span>Total a cobrar</span>
          <span>${totalCalc.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <input
            id="split-pay"
            type="checkbox"
            checked={splitEnabled}
            onChange={(e) => setSplitEnabled(e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="split-pay" className="cursor-pointer">Dividir en dos medios de pago</Label>
        </div>
        {splitEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div>
              <Label className="text-xs">Pago 1 ({form.payment_method})</Label>
              <Input value={amount1Calc} disabled />
            </div>
            <div>
              <Label className="text-xs">Pago 2 - Monto</Label>
              <Input
                type="number"
                min={0}
                max={totalCalc}
                value={amount2}
                placeholder="0"
                onChange={(e) => setAmount2(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Pago 2 - Medio</Label>
              <Select value={payment2} onValueChange={setPayment2}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="nequi">Nequi</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={handleSubmit} disabled={!form.inventory_id || add.isPending}>
          <Plus className="mr-2 h-4 w-4" /> Registrar venta
        </Button>
      </div>
    </Card>
  );
}