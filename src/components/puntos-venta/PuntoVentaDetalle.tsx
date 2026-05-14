import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Plus, UserCheck, Search } from "lucide-react";
import { CONSUMIDOR_FINAL, PosProduct, useRegisterPosSale } from "@/hooks/usePuntosVenta";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = { locationId: string; products: PosProduct[] };

export function PuntoVentaDetalle({ locationId, products }: Props) {
  const sale = useRegisterPosSale(locationId);
  const [form, setForm] = useState({
    product_id: "",
    quantity: "1",
    unit_price: "",
    payment_method: "efectivo",
    client_name: "",
    client_email: "",
    client_document: "",
    discount: "",
    notes: "",
  });
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [payment2, setPayment2] = useState("tarjeta");
  const [amount2, setAmount2] = useState("");

  const selected = useMemo(
    () => products.find((p) => p.id === form.product_id),
    [products, form.product_id]
  );

  const qtyNum = parseInt(form.quantity, 10) || 0;
  const priceNum = parseFloat(form.unit_price) || 0;
  const discountNum = Math.max(0, parseFloat(form.discount) || 0);
  const subtotal = qtyNum * priceNum;
  const totalCalc = Math.max(0, subtotal - discountNum);
  const amount2Num = Math.max(0, parseFloat(amount2) || 0);
  const amount1Calc = Math.max(0, totalCalc - amount2Num);

  const handleSelectProduct = (id: string) => {
    const p = products.find((x) => x.id === id);
    setForm({ ...form, product_id: id, unit_price: p ? String(p.sale_price) : "" });
  };

  const setConsumidorFinal = () => {
    setForm({
      ...form,
      client_name: CONSUMIDOR_FINAL.client_name,
      client_document: CONSUMIDOR_FINAL.client_document,
      client_email: CONSUMIDOR_FINAL.client_email,
    });
    toast.success("Datos de Consumidor Final cargados");
  };

  const handleSubmit = async () => {
    if (!selected) return;
    if (qtyNum <= 0) { toast.error("Cantidad inválida"); return; }
    if (qtyNum > Number(selected.available)) { toast.error("Sin stock suficiente"); return; }
    if (priceNum <= 0) { toast.error("Falta precio unitario"); return; }
    try {
      await sale.mutateAsync({
        items: [{ product: selected, quantity: qtyNum }],
        override_unit_prices: { [selected.id]: priceNum },
        payment_method: form.payment_method,
        client_name: form.client_name || undefined,
        client_email: form.client_email || undefined,
        client_document: form.client_document || undefined,
        discount: discountNum,
        notes: form.notes || undefined,
        split: splitEnabled && amount2Num > 0 ? { method: payment2, amount: amount2Num } : undefined,
      });
      toast.success(`Venta registrada por $${totalCalc.toLocaleString()}`);
      setForm({
        product_id: "", quantity: "1", unit_price: "",
        payment_method: "efectivo", client_name: "", client_email: "",
        client_document: "", discount: "", notes: "",
      });
      setSplitEnabled(false);
      setAmount2("");
    } catch (e: any) {
      toast.error(e.message ?? "Error al registrar venta");
    }
  };

  return (
    <Card className="p-4 max-w-3xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Registrar venta con detalle</h3>
        <Button size="sm" variant="outline" onClick={setConsumidorFinal}>
          <UserCheck className="h-4 w-4 mr-1" /> Consumidor final
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Producto</Label>
          <Select value={form.product_id} onValueChange={handleSelectProduct}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>
              {products.filter((p) => p.active && Number(p.available) > 0).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}{p.brand ? ` (${p.brand})` : ""} — {Number(p.available)} disp.
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Cantidad</Label>
          <Input type="number" min={1} max={selected ? Number(selected.available) : undefined}
            value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        </div>
        <div>
          <Label>Precio unitario</Label>
          <Input type="number" value={form.unit_price}
            onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
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
          <Input type="email" value={form.client_email}
            onChange={(e) => setForm({ ...form, client_email: e.target.value })} />
        </div>
        <div>
          <Label>Cédula / NIT (opcional)</Label>
          <Input value={form.client_document}
            onChange={(e) => setForm({ ...form, client_document: e.target.value })} />
        </div>
        <div>
          <Label>Descuento ($)</Label>
          <Input type="number" min={0} value={form.discount} placeholder="0"
            onChange={(e) => setForm({ ...form, discount: e.target.value })} />
        </div>
        <div className="md:col-span-2">
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
          <input id="pos-split" type="checkbox" checked={splitEnabled}
            onChange={(e) => setSplitEnabled(e.target.checked)} className="h-4 w-4" />
          <Label htmlFor="pos-split" className="cursor-pointer">Dividir en dos medios de pago</Label>
        </div>
        {splitEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div>
              <Label className="text-xs">Pago 1 ({form.payment_method})</Label>
              <Input value={amount1Calc} disabled />
            </div>
            <div>
              <Label className="text-xs">Pago 2 - Monto</Label>
              <Input type="number" min={0} max={totalCalc} value={amount2} placeholder="0"
                onChange={(e) => setAmount2(e.target.value)} />
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
        <Button onClick={handleSubmit} disabled={!form.product_id || sale.isPending}>
          <Plus className="mr-2 h-4 w-4" /> Registrar venta
        </Button>
      </div>
    </Card>
  );
}
