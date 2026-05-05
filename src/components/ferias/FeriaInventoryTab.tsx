import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Send, CheckCircle2, Pencil, Check, X } from "lucide-react";
import { useFeriaInventory, useAddFeriaInventory, useDeleteFeriaInventory, useUpdateFeriaInventory, useFeriaSales, useFeriaDispatchRequest, useCreateDispatchRequest } from "@/hooks/useFerias";
import { useAuth } from "@/contexts/AuthContext";
import { useInventory } from "@/hooks/useInventory";
import { useMemo } from "react";

export function FeriaInventoryTab({ feriaId }: { feriaId: string }) {
  const { data: inventory = [] } = useFeriaInventory(feriaId);
  const { data: sales = [] } = useFeriaSales(feriaId);
  const { data: dispatchReq } = useFeriaDispatchRequest(feriaId);
  const sendToLogistics = useCreateDispatchRequest();
  const { role } = useAuth();
  const canSend = role === "admin" || role === "asesor_comercial";
  const add = useAddFeriaInventory();
  const del = useDeleteFeriaInventory();
  const upd = useUpdateFeriaInventory();
  const { stockItems } = useInventory();

  // Selection format: "magical|<name> (<Frío|Térmico>)"  or  "sweatspot|<name> - <color>"
  const [selectedKey, setSelectedKey] = useState("");
  const [form, setForm] = useState({ quantity_assigned: "", unit_price: "", unit_cost: "", notes: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ quantity_assigned: "", unit_price: "", unit_cost: "" });

  const magicalOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { value: string; label: string }[] = [];
    stockItems
      .filter((it) => it.brand === "magical" && it.category === "producto_terminado")
      .forEach((it) => {
        const label = it.product_type ? `${it.name} (${it.product_type})` : it.name;
        const value = `magical|${label}`;
        if (!seen.has(value)) {
          seen.add(value);
          opts.push({ value, label });
        }
      });
    return opts.sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [stockItems]);

  const sweatspotOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { value: string; label: string }[] = [];
    stockItems
      .filter((it) => it.brand === "sweatspot" && it.category === "producto_terminado")
      .forEach((it) => {
        const label = it.color ? `${it.name} - ${it.color}` : it.name;
        const value = `sweatspot|${label}`;
        if (!seen.has(value)) {
          seen.add(value);
          opts.push({ value, label });
        }
      });
    return opts.sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [stockItems]);

  const soldByProduct = sales.reduce<Record<string, number>>((acc, s) => {
    const k = `${s.brand}|${s.product_name}`;
    acc[k] = (acc[k] || 0) + s.quantity;
    return acc;
  }, {});

  const handleAdd = async () => {
    if (!selectedKey || !form.quantity_assigned) return;
    const [brand, productName] = selectedKey.split("|");
    await add.mutateAsync({
      feria_id: feriaId,
      brand,
      product_name: productName,
      quantity_assigned: parseInt(form.quantity_assigned, 10),
      quantity_returned: 0,
      quantity_dispatched: 0,
      dispatch_status: "pendiente",
      unit_price: parseFloat(form.unit_price) || 0,
      unit_cost: parseFloat(form.unit_cost) || 0,
      notes: form.notes || null,
    });
    setSelectedKey("");
    setForm({ quantity_assigned: "", unit_price: "", unit_cost: "", notes: "" });
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
          <div className="md:col-span-2">
            <Label>Producto (Magical o Sweatspot)</Label>
            <Select value={selectedKey} onValueChange={setSelectedKey}>
              <SelectTrigger><SelectValue placeholder="Seleccionar referencia..." /></SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectGroup>
                  <SelectLabel>Magical Warmers</SelectLabel>
                  {magicalOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Sweatspot</SelectLabel>
                  {sweatspotOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Cantidad</Label><Input type="number" value={form.quantity_assigned} onChange={(e) => setForm({ ...form, quantity_assigned: e.target.value })} /></div>
          <div><Label>Costo unitario</Label><Input type="number" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} /></div>
          <div><Label>Precio venta</Label><Input type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} /></div>
          <div className="md:col-span-5 flex justify-end">
            <Button onClick={handleAdd} disabled={!selectedKey || !form.quantity_assigned}>
              <Plus className="mr-2 h-4 w-4" />Agregar referencia
            </Button>
          </div>
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
              <TableHead className="text-right">Costo</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Sin productos asignados</TableCell></TableRow>
            ) : inventory.map((it) => {
              const sold = soldByProduct[`${it.brand}|${it.product_name}`] || 0;
              const base = it.dispatch_status === "despachado" ? it.quantity_dispatched : it.quantity_assigned;
              const remaining = base - sold;
              const isEditing = editingId === it.id;
              return (
                <TableRow key={it.id}>
                  <TableCell><Badge variant="outline" className="capitalize">{it.brand}</Badge></TableCell>
                  <TableCell>{it.product_name}</TableCell>
                  <TableCell className="text-right">
                    {isEditing ? (
                      <Input type="number" className="h-7 w-20 ml-auto text-right" value={editForm.quantity_assigned}
                        onChange={(e) => setEditForm({ ...editForm, quantity_assigned: e.target.value })} />
                    ) : it.quantity_assigned}
                  </TableCell>
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
                  <TableCell className="text-right">
                    {isEditing ? (
                      <Input type="number" className="h-7 w-24 ml-auto text-right" value={editForm.unit_cost}
                        onChange={(e) => setEditForm({ ...editForm, unit_cost: e.target.value })} />
                    ) : `$${(it.unit_cost || 0).toLocaleString()}`}
                  </TableCell>
                  <TableCell className="text-right">
                    {isEditing ? (
                      <Input type="number" className="h-7 w-24 ml-auto text-right" value={editForm.unit_price}
                        onChange={(e) => setEditForm({ ...editForm, unit_price: e.target.value })} />
                    ) : `$${it.unit_price.toLocaleString()}`}
                  </TableCell>
                  <TableCell className="text-right space-x-1 whitespace-nowrap">
                    {isEditing ? (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => {
                          await upd.mutateAsync({
                            id: it.id, feria_id: feriaId,
                            quantity_assigned: parseInt(editForm.quantity_assigned, 10) || 0,
                            unit_price: parseFloat(editForm.unit_price) || 0,
                            unit_cost: parseFloat(editForm.unit_cost) || 0,
                          });
                          setEditingId(null);
                        }}><Check className="h-4 w-4 text-primary" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          setEditingId(it.id);
                          setEditForm({
                            quantity_assigned: String(it.quantity_assigned),
                            unit_price: String(it.unit_price || 0),
                            unit_cost: String(it.unit_cost || 0),
                          });
                        }}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => del.mutate({ id: it.id, feria_id: feriaId })}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
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
