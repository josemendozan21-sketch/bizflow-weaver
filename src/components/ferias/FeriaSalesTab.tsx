import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, DollarSign, ShoppingBag, Package } from "lucide-react";
import { useFeriaSales, useAddFeriaSale, useDeleteFeriaSale, useFeriaInventory } from "@/hooks/useFerias";
import { format } from "date-fns";

export function FeriaSalesTab({ feriaId }: { feriaId: string }) {
  const { data: sales = [] } = useFeriaSales(feriaId);
  const { data: inventory = [] } = useFeriaInventory(feriaId);
  const add = useAddFeriaSale();
  const del = useDeleteFeriaSale();
  const [form, setForm] = useState({ brand: "magical", product_name: "", quantity: "1", unit_price: "", payment_method: "efectivo", client_name: "", notes: "" });

  const stats = useMemo(() => {
    const total = sales.reduce((s, x) => s + Number(x.total_amount), 0);
    const units = sales.reduce((s, x) => s + x.quantity, 0);
    const byProduct = sales.reduce<Record<string, number>>((acc, s) => {
      acc[s.product_name] = (acc[s.product_name] || 0) + s.quantity;
      return acc;
    }, {});
    const top = Object.entries(byProduct).sort((a, b) => b[1] - a[1])[0];
    return { total, units, count: sales.length, top };
  }, [sales]);

  const productOptions = inventory.filter((i) => i.brand === form.brand);

  const handleAdd = async () => {
    if (!form.product_name || !form.quantity) return;
    const qty = parseInt(form.quantity, 10);
    const price = parseFloat(form.unit_price) || 0;
    await add.mutateAsync({
      feria_id: feriaId,
      brand: form.brand,
      product_name: form.product_name,
      quantity: qty,
      unit_price: price,
      total_amount: qty * price,
      payment_method: form.payment_method || null,
      client_name: form.client_name || null,
      notes: form.notes || null,
    });
    setForm({ ...form, product_name: "", quantity: "1", unit_price: "", client_name: "", notes: "" });
  };

  const onSelectProduct = (name: string) => {
    const p = productOptions.find((i) => i.product_name === name);
    setForm({ ...form, product_name: name, unit_price: p ? String(p.unit_price) : form.unit_price });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="flex items-center gap-3"><DollarSign className="h-5 w-5 text-emerald-600" /><div><p className="text-xs text-muted-foreground">Ingresos</p><p className="text-lg font-semibold">${stats.total.toLocaleString()}</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-3"><ShoppingBag className="h-5 w-5 text-blue-600" /><div><p className="text-xs text-muted-foreground">Ventas</p><p className="text-lg font-semibold">{stats.count}</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-3"><Package className="h-5 w-5 text-purple-600" /><div><p className="text-xs text-muted-foreground">Unidades</p><p className="text-lg font-semibold">{stats.units}</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-3"><div><p className="text-xs text-muted-foreground">Más vendido</p><p className="text-sm font-semibold truncate">{stats.top ? `${stats.top[0]} (${stats.top[1]})` : "—"}</p></div></div></Card>
      </div>

      <Card className="p-4">
        <h3 className="font-semibold mb-3">Registrar venta</h3>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div>
            <Label>Marca</Label>
            <Select value={form.brand} onValueChange={(v) => setForm({ ...form, brand: v, product_name: "" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="magical">Magical</SelectItem>
                <SelectItem value="sweatspot">Sweatspot</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Producto</Label>
            {productOptions.length > 0 ? (
              <Select value={form.product_name} onValueChange={onSelectProduct}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{productOptions.map((p) => <SelectItem key={p.id} value={p.product_name}>{p.product_name}</SelectItem>)}</SelectContent>
              </Select>
            ) : (
              <Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
            )}
          </div>
          <div><Label>Cantidad</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
          <div><Label>Precio</Label><Input type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} /></div>
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
          <div className="flex items-end"><Button className="w-full" onClick={handleAdd}><Plus className="mr-2 h-4 w-4" />Registrar</Button></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div><Label>Cliente (opcional)</Label><Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></div>
          <div><Label>Notas</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Cant.</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Sin ventas registradas</TableCell></TableRow>
            ) : sales.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{format(new Date(s.sale_date), "dd/MM HH:mm")}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{s.brand}</Badge></TableCell>
                <TableCell>{s.product_name}</TableCell>
                <TableCell className="text-right">{s.quantity}</TableCell>
                <TableCell className="text-right font-medium">${Number(s.total_amount).toLocaleString()}</TableCell>
                <TableCell className="capitalize">{s.payment_method || "—"}</TableCell>
                <TableCell>{s.client_name || "—"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => del.mutate({ id: s.id, feria_id: feriaId })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
