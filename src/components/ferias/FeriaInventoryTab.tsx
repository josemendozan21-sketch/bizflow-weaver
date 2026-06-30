import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Send, CheckCircle2, Pencil, Check, X, Target } from "lucide-react";
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
  const canManage = role === "admin" || role === "asesor_comercial";
  const canEditQuantity = canManage || role === "logistica";
  const canSeeFinancials = role === "admin" || role === "asesor_comercial" || role === "contabilidad";
  const add = useAddFeriaInventory();
  const del = useDeleteFeriaInventory();
  const upd = useUpdateFeriaInventory();
  const { stockItems } = useInventory();

  // Independent brand + product + color selectors so admin can plan any combination
  const [brand, setBrand] = useState<"magical" | "sweatspot" | "">("");
  const [productName, setProductName] = useState("");
  const [color, setColor] = useState("");
  const [edicionEspecial, setEdicionEspecial] = useState(false);
  const [otroProductoTexto, setOtroProductoTexto] = useState("");
  const [form, setForm] = useState({ quantity_assigned: "", unit_price: "", unit_cost: "", notes: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ quantity_assigned: "", unit_price: "", unit_cost: "" });

  // Distinct product names per brand (color is selected separately so admin can project any color)
  const productsByBrand = useMemo(() => {
    const map: Record<string, { names: Set<string>; colorsByName: Record<string, Set<string>> }> = {
      magical: { names: new Set(), colorsByName: {} },
      sweatspot: { names: new Set(), colorsByName: {} },
    };
    stockItems
      .filter((it) => (it.brand === "magical" || it.brand === "sweatspot") && it.category === "producto_terminado")
      .forEach((it) => {
        const b = it.brand as "magical" | "sweatspot";
        map[b].names.add(it.name);
        if (!map[b].colorsByName[it.name]) map[b].colorsByName[it.name] = new Set();
        if (it.color) map[b].colorsByName[it.name].add(it.color);
        if (b === "magical" && it.product_type) map[b].colorsByName[it.name].add(it.product_type);
      });
    return map;
  }, [stockItems]);

  const SWEATSPOT_COMMON_COLORS = ["Surtidos", "Negro", "Blanco", "Azul", "Rosado", "Morado", "Verde Militar", "Rojo", "Gris", "Beige", "Único"];
  const MAGICAL_VARIANTS = ["Frío", "Térmico"];

  const currentProducts = brand ? Array.from(productsByBrand[brand].names).sort((a, b) => a.localeCompare(b, "es")) : [];
  const currentColors = useMemo(() => {
    if (!brand || !productName) return [];
    const fromStock = Array.from(productsByBrand[brand].colorsByName[productName] || []);
    const extras = brand === "sweatspot" ? SWEATSPOT_COMMON_COLORS : MAGICAL_VARIANTS;
    const all = Array.from(new Set([...fromStock, ...extras])).sort((a, b) => a.localeCompare(b, "es"));
    if (brand === "magical") return all;
    // Sweatspot: keep "Surtidos" at the top for visibility
    return ["Surtidos", ...all.filter((c) => c !== "Surtidos")];
  }, [brand, productName, productsByBrand]);

  const soldByProduct = sales.reduce<Record<string, number>>((acc, s) => {
    const k = `${s.brand}|${s.product_name}`;
    acc[k] = (acc[k] || 0) + s.quantity;
    return acc;
  }, {});

  const handleAdd = async () => {
    if (!brand || !form.quantity_assigned) return;
    let label = "";
    if (productName === "__OTRO__") {
      if (!otroProductoTexto.trim()) return;
      label = otroProductoTexto.trim();
    } else {
      if (!productName) return;
      const colorLabel = brand === "sweatspot" && edicionEspecial
        ? (color ? `${color} (Edición Especial)` : "Edición Especial")
        : color;
      label = colorLabel ? `${productName}${brand === "magical" ? ` (${colorLabel})` : ` - ${colorLabel}`}` : productName;
    }
    await add.mutateAsync({
      feria_id: feriaId,
      brand,
      product_name: label,
      quantity_assigned: parseInt(form.quantity_assigned, 10),
      quantity_returned: 0,
      quantity_dispatched: 0,
      dispatch_status: "pendiente",
      unit_price: parseFloat(form.unit_price) || 0,
      unit_cost: parseFloat(form.unit_cost) || 0,
      notes: form.notes || null,
    });
    setBrand("");
    setProductName("");
    setColor("");
    setEdicionEspecial(false);
    setOtroProductoTexto("");
    setForm({ quantity_assigned: "", unit_price: "", unit_cost: "", notes: "" });
  };

  // Projection summary
  const projection = useMemo(() => {
    const totalUnits = inventory.reduce((a, b) => a + (b.quantity_assigned || 0), 0);
    const expectedRevenue = inventory.reduce((a, b) => a + (b.quantity_assigned || 0) * (b.unit_price || 0), 0);
    const expectedCost = inventory.reduce((a, b) => a + (b.quantity_assigned || 0) * (b.unit_cost || 0), 0);
    const expectedMargin = expectedRevenue - expectedCost;
    const soldUnits = sales.reduce((a, s) => a + (s.quantity || 0), 0);
    const progress = totalUnits > 0 ? Math.round((soldUnits / totalUnits) * 100) : 0;
    return { totalUnits, expectedRevenue, expectedCost, expectedMargin, soldUnits, progress };
  }, [inventory, sales]);

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

      {canManage && (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-semibold">Asignar producto / Proyección</h3>
          {canSend && inventory.length > 0 && (
            <Button size="sm" onClick={() => sendToLogistics.mutate(feriaId)} disabled={sendToLogistics.isPending}>
              <Send className="mr-2 h-4 w-4" />
              {dispatchReq ? "Reenviar a logística" : "Enviar a logística"}
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div>
            <Label>Marca</Label>
            <Select value={brand} onValueChange={(v) => { setBrand(v as any); setProductName(""); setColor(""); setOtroProductoTexto(""); }}>
              <SelectTrigger><SelectValue placeholder="Marca..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="magical">Magical Warmers</SelectItem>
                <SelectItem value="sweatspot">Sweatspot</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Producto</Label>
            <Select value={productName} onValueChange={(v) => { setProductName(v); setColor(""); setOtroProductoTexto(""); }} disabled={!brand}>
              <SelectTrigger><SelectValue placeholder={brand ? "Producto..." : "Marca primero"} /></SelectTrigger>
              <SelectContent className="max-h-80">
                {currentProducts.map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
                <SelectItem value="__OTRO__">Otro (escribir)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {productName === "__OTRO__" ? (
            <div>
              <Label>Descripción del producto</Label>
              <Input
                placeholder="Ej: Camiseta logo X talla M"
                value={otroProductoTexto}
                onChange={(e) => setOtroProductoTexto(e.target.value)}
              />
            </div>
          ) : (
          <div>
            <Label>{brand === "magical" ? "Variante" : "Color"}</Label>
            <Select value={color} onValueChange={setColor} disabled={!productName}>
              <SelectTrigger><SelectValue placeholder={productName ? "Color..." : "Producto primero"} /></SelectTrigger>
              <SelectContent className="max-h-80">
                {currentColors.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="mt-1 h-7 text-xs"
              placeholder="O escribe color/variante personalizado"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              disabled={!productName}
            />
            {brand === "sweatspot" && (
              <label className="mt-2 flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={edicionEspecial}
                  onChange={(e) => setEdicionEspecial(e.target.checked)}
                  disabled={!productName}
                  className="h-3.5 w-3.5"
                />
                <span>Edición Especial</span>
              </label>
            )}
          </div>
          )}
          <div><Label>Cantidad</Label><Input type="number" value={form.quantity_assigned} onChange={(e) => setForm({ ...form, quantity_assigned: e.target.value })} /></div>
          <div><Label>Costo unitario</Label><Input type="number" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} /></div>
          <div><Label>Precio venta</Label><Input type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} /></div>
          <div className="md:col-span-6 flex justify-end">
            <Button onClick={handleAdd} disabled={!brand || !form.quantity_assigned || (productName === "__OTRO__" ? !otroProductoTexto.trim() : !productName)}>
              <Plus className="mr-2 h-4 w-4" />Agregar referencia
            </Button>
          </div>
        </div>
      </Card>
      )}

      {canSeeFinancials && inventory.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Proyección de venta</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <div><div className="text-muted-foreground text-xs">Unidades planificadas</div><div className="text-lg font-bold">{projection.totalUnits}</div></div>
            <div><div className="text-muted-foreground text-xs">Ingresos esperados</div><div className="text-lg font-bold">${projection.expectedRevenue.toLocaleString()}</div></div>
            <div><div className="text-muted-foreground text-xs">Costo esperado</div><div className="text-lg font-bold">${projection.expectedCost.toLocaleString()}</div></div>
            <div><div className="text-muted-foreground text-xs">Margen esperado</div><div className="text-lg font-bold text-emerald-600">${projection.expectedMargin.toLocaleString()}</div></div>
            <div><div className="text-muted-foreground text-xs">Avance ventas</div><div className="text-lg font-bold">{projection.soldUnits} / {projection.totalUnits} ({projection.progress}%)</div></div>
          </div>
        </Card>
      )}

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
              {canSeeFinancials && <TableHead className="text-right">Costo</TableHead>}
              {canSeeFinancials && <TableHead className="text-right">Precio</TableHead>}
              {canEditQuantity && <TableHead></TableHead>}
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
                  {canSeeFinancials && <TableCell className="text-right">
                    {isEditing ? (
                      <Input type="number" className="h-7 w-24 ml-auto text-right" value={editForm.unit_cost}
                        onChange={(e) => setEditForm({ ...editForm, unit_cost: e.target.value })} />
                    ) : `$${(it.unit_cost || 0).toLocaleString()}`}
                  </TableCell>}
                  {canSeeFinancials && <TableCell className="text-right">
                    {isEditing ? (
                      <Input type="number" className="h-7 w-24 ml-auto text-right" value={editForm.unit_price}
                        onChange={(e) => setEditForm({ ...editForm, unit_price: e.target.value })} />
                    ) : `$${it.unit_price.toLocaleString()}`}
                  </TableCell>}
                  {canEditQuantity && <TableCell className="text-right space-x-1 whitespace-nowrap">
                    {isEditing ? (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => {
                          await upd.mutateAsync({
                            id: it.id, feria_id: feriaId,
                            quantity_assigned: parseInt(editForm.quantity_assigned, 10) || 0,
                            unit_price: canSeeFinancials ? (parseFloat(editForm.unit_price) || 0) : (it.unit_price || 0),
                            unit_cost: canSeeFinancials ? (parseFloat(editForm.unit_cost) || 0) : (it.unit_cost || 0),
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
                        {canManage && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => del.mutate({ id: it.id, feria_id: feriaId })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </TableCell>}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
