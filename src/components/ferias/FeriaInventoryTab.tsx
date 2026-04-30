import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Send, CheckCircle2 } from "lucide-react";
import { useFeriaInventory, useAddFeriaInventory, useDeleteFeriaInventory, useFeriaSales, useFeriaDispatchRequest, useCreateDispatchRequest } from "@/hooks/useFerias";
import { useAuth } from "@/contexts/AuthContext";

export function FeriaInventoryTab({ feriaId }: { feriaId: string }) {
  const { data: inventory = [] } = useFeriaInventory(feriaId);
  const { data: sales = [] } = useFeriaSales(feriaId);
  const { data: dispatchReq } = useFeriaDispatchRequest(feriaId);
  const sendToLogistics = useCreateDispatchRequest();
  const { role } = useAuth();
  const canSend = role === "admin" || role === "asesor_comercial";
  const add = useAddFeriaInventory();
  const del = useDeleteFeriaInventory();
  const [form, setForm] = useState({ brand: "magical", product_name: "", quantity_assigned: "", unit_price: "", notes: "" });

  const soldByProduct = sales.reduce<Record<string, number>>((acc, s) => {
    const k = `${s.brand}|${s.product_name}`;
    acc[k] = (acc[k] || 0) + s.quantity;
    return acc;
  }, {});

  const handleAdd = async () => {
    if (!form.product_name || !form.quantity_assigned) return;
    await add.mutateAsync({
      feria_id: feriaId,
      brand: form.brand,
      product_name: form.product_name,
      quantity_assigned: parseInt(form.quantity_assigned, 10),
      quantity_returned: 0,
      quantity_dispatched: 0,
      dispatch_status: "pendiente",
      unit_price: parseFloat(form.unit_price) || 0,
      notes: form.notes || null,
    });
    setForm({ ...form, product_name: "", quantity_assigned: "", unit_price: "", notes: "" });
  };

  return (
    <div className="space-y-4">
      {dispatchReq && (
        <Card className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            {dispatchReq.status === "despachado" ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Despacho confirmado por logística{dispatchReq.dispatched_at ? ` el ${new Date(dispatchReq.dispatched_at).toLocaleDateString("es-CO")}` : ""}.</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4 text-amber-600" />
                <span>Solicitud enviada — pendiente de despacho por logística.</span>
              </>
            )}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-semibold">Asignar producto</h3>
          {canSend && inventory.length > 0 && (!dispatchReq || dispatchReq.status === "pendiente") && (
            <Button size="sm" onClick={() => sendToLogistics.mutate(feriaId)} disabled={sendToLogistics.isPending}>
              <Send className="mr-2 h-4 w-4" />
              {dispatchReq ? "Reenviar a logística" : "Enviar a logística"}
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <Label>Marca</Label>
            <Select value={form.brand} onValueChange={(v) => setForm({ ...form, brand: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="magical">Magical</SelectItem>
                <SelectItem value="sweatspot">Sweatspot</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Producto</Label><Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} /></div>
          <div><Label>Cantidad</Label><Input type="number" value={form.quantity_assigned} onChange={(e) => setForm({ ...form, quantity_assigned: e.target.value })} /></div>
          <div><Label>Precio unitario</Label><Input type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} /></div>
          <div className="flex items-end"><Button className="w-full" onClick={handleAdd}><Plus className="mr-2 h-4 w-4" />Agregar</Button></div>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Marca</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Pedido</TableHead>
              <TableHead className="text-right">Despachado</TableHead>
              <TableHead className="text-right">Vendido</TableHead>
              <TableHead className="text-right">Restante</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Sin productos asignados</TableCell></TableRow>
            ) : inventory.map((it) => {
              const sold = soldByProduct[`${it.brand}|${it.product_name}`] || 0;
              const base = it.dispatch_status === "despachado" ? it.quantity_dispatched : it.quantity_assigned;
              const remaining = base - sold;
              return (
                <TableRow key={it.id}>
                  <TableCell><Badge variant="outline" className="capitalize">{it.brand}</Badge></TableCell>
                  <TableCell>{it.product_name}</TableCell>
                  <TableCell className="text-right">{it.quantity_assigned}</TableCell>
                  <TableCell className="text-right">
                    {it.dispatch_status === "despachado" ? (
                      <span className="font-medium text-emerald-600">{it.quantity_dispatched}</span>
                    ) : (
                      <Badge variant="outline">Pendiente</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{sold}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={remaining < 0 ? "destructive" : remaining === 0 ? "secondary" : "default"}>{remaining}</Badge>
                  </TableCell>
                  <TableCell className="text-right">${it.unit_price.toLocaleString()}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => del.mutate({ id: it.id, feria_id: feriaId })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
