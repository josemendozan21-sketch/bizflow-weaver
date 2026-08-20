import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Send, CheckCircle2, Pencil, Check, X, Target, Download, Search } from "lucide-react";
import { useFeriaInventory, useAddFeriaInventory, useDeleteFeriaInventory, useUpdateFeriaInventory, useFeriaSales, useFeriaDispatchRequest, useCreateDispatchRequest, useFerias } from "@/hooks/useFerias";
import { useAuth } from "@/contexts/AuthContext";
import { useInventory } from "@/hooks/useInventory";
import { useMemo } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import DebouncedSearchInput from "@/components/inventory/DebouncedSearchInput";

export function FeriaInventoryTab({ feriaId }: { feriaId: string }) {
  const { data: inventory = [] } = useFeriaInventory(feriaId);
  const { data: sales = [] } = useFeriaSales(feriaId);
  const { data: dispatchReq } = useFeriaDispatchRequest(feriaId);
  const { data: ferias = [] } = useFerias();
  const feria = useMemo(() => ferias.find((f) => f.id === feriaId), [ferias, feriaId]);
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
  const [inventorySearch, setInventorySearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<"" | "magical" | "sweatspot">("");
  const [colorFilter, setColorFilter] = useState("");

  const brandOptions = useMemo(() => Array.from(new Set(inventory.map((it) => it.brand))).filter(Boolean).sort(), [inventory]);

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

  const filteredInventory = useMemo(() => {
    const q = inventorySearch.trim().toLowerCase();
    return inventory.filter((it) => {
      if (brandFilter && it.brand !== brandFilter) return false;
      const matchesSearch = !q ||
        String(it.product_name).toLowerCase().includes(q) ||
        String(it.brand).toLowerCase().includes(q) ||
        String(it.notes).toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (colorFilter) {
        const productText = String(it.product_name).toLowerCase();
        return productText.includes(colorFilter.toLowerCase());
      }
      return true;
    });
  }, [inventory, inventorySearch, brandFilter, colorFilter]);

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
    // Los kits se arman con la mercancía ya enviada, así que no suman al ingreso
    // esperado ni al costo (evita duplicar la proyección).
    const isKit = (b: any) => (b.product_name || "").trim().toLowerCase().startsWith("kit ");
    const realInventory = inventory.filter((b) => !isKit(b));
    const totalUnits = realInventory.reduce((a, b) => a + (b.quantity_assigned || 0), 0);
    const expectedRevenue = realInventory.reduce((a, b) => a + (b.quantity_assigned || 0) * (b.unit_price || 0), 0);
    const expectedCost = realInventory.reduce((a, b) => a + (b.quantity_assigned || 0) * (b.unit_cost || 0), 0);
    const expectedMargin = expectedRevenue - expectedCost;
    const soldUnits = sales.reduce((a, s) => a + (s.quantity || 0), 0);
    const progress = totalUnits > 0 ? Math.round((soldUnits / totalUnits) * 100) : 0;
    return { totalUnits, expectedRevenue, expectedCost, expectedMargin, soldUnits, progress };
  }, [inventory, sales]);

  // Presupuestos de costos fijos (usa reales si existen, si no presupuestados)
  const fixedCostBreakdown = useMemo(() => {
    if (!feria) return [] as Array<{ label: string; value: number; source: "real" | "presupuestado" }>;
    const pick = (real: number, budget: number): { value: number; source: "real" | "presupuestado" } =>
      (real || 0) > 0 ? { value: real || 0, source: "real" } : { value: budget || 0, source: "presupuestado" };
    return [
      { label: "Stand / Feria", ...pick(feria.stand_cost, feria.budget_stand_cost) },
      { label: "Personal", ...pick(feria.employees_cost, feria.budget_employees_cost) },
      { label: "Envío mercancía", ...pick(feria.shipping_cost, feria.budget_shipping_cost) },
      { label: "Tiquetes", ...pick(feria.tickets_cost, feria.budget_tickets_cost) },
      { label: "Publicidad", ...pick(feria.advertising_cost, feria.budget_advertising_cost) },
      { label: "Hospedaje", ...pick(feria.lodging_cost, feria.budget_lodging_cost) },
      { label: "Transporte", ...pick(feria.transport_cost, feria.budget_transport_cost) },
      { label: "Alimentación (viáticos)", ...pick(feria.food_cost, feria.budget_food_cost) },
      { label: "Otros", ...pick(feria.other_costs, feria.budget_other_costs) },
    ].filter((r) => r.value > 0);
  }, [feria]);
  const fixedCostsTotal = useMemo(
    () => fixedCostBreakdown.reduce((a, r) => a + r.value, 0),
    [fixedCostBreakdown]
  );
  const netExpectedMargin = projection.expectedMargin - fixedCostsTotal;
  const totalExpectedCost = projection.expectedCost + fixedCostsTotal;

  const isMagicalTermoReference = (productName: string) => {
    const raw = String(productName || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (raw.includes("canguro") || raw.includes("chaleco")) return false;
    const termoKeywords = ["250", "150", "500", "jugueton", "juguetón", "con correa", "sin correa"];
    return termoKeywords.some((k) => raw.includes(k));
  };

  const handleExportEstampacion = () => {
    const rows = inventory
      .filter((it: any) => it.brand === "magical" && isMagicalTermoReference(it.product_name))
      .map((it: any) => {
        const raw = String(it.product_name || "");
        // Try to split "REFERENCE - COLOR" or "REFERENCE (VARIANT)"
        const m = raw.match(/^(.*?)\s*[-\(]\s*(.+?)\)?\s*$/);
        const ref = (m ? m[1] : raw).trim();
        const col = m ? m[2].trim().replace(/\)$/, "") : "";
        return {
          Referencia: ref,
          Color: col,
          Marca: "Magical Warmers",
          Unidades: Number(it.quantity_dispatched || 0) || Number(it.quantity_assigned || 0),
        };
      });
    if (rows.length === 0) {
      toast.info("No hay referencias de termos Magical para exportar");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(rows, { header: ["Referencia", "Color", "Marca", "Unidades"] });
    ws["!cols"] = [{ wch: 40 }, { wch: 22 }, { wch: 18 }, { wch: 10 }];
    const total = rows.reduce((a, r) => a + (Number(r.Unidades) || 0), 0);
    XLSX.utils.sheet_add_json(
      ws,
      [{ Referencia: "Total unidades", Color: "", Marca: "", Unidades: total }],
      { origin: -1, skipHeader: true }
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estampacion");
    const name = (feria?.name || "feria").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_");
    XLSX.writeFile(wb, `unidades_feria_${name}.xlsx`);
    toast.success(`Excel descargado para estampación (${rows.length} referencias, ${total} unidades)`);
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
            <div><div className="text-muted-foreground text-xs">Costo mercancía</div><div className="text-lg font-bold">${projection.expectedCost.toLocaleString()}</div></div>
            <div><div className="text-muted-foreground text-xs">Margen mercancía</div><div className="text-lg font-bold text-emerald-600">${projection.expectedMargin.toLocaleString()}</div></div>
            <div><div className="text-muted-foreground text-xs">Avance ventas</div><div className="text-lg font-bold">{projection.soldUnits} / {projection.totalUnits} ({projection.progress}%)</div></div>
          </div>

          {/* Presupuesto de costos fijos */}
          <div className="mt-4 border rounded-lg p-3 bg-muted/30">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="text-xs font-semibold">
                Presupuesto de costos fijos
                <span className="text-[10px] text-muted-foreground font-normal ml-1">(personal, stand, transporte, viáticos…)</span>
              </div>
              <div className="text-xs">
                <span className="text-muted-foreground">Total: </span>
                <span className="font-bold">${fixedCostsTotal.toLocaleString()}</span>
              </div>
            </div>
            {fixedCostBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aún no hay costos registrados ni presupuestados. Defínelos al editar la feria.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
                {fixedCostBreakdown.map((c) => (
                  <div key={c.label} className="border rounded p-2 bg-background">
                    <div className="text-[10px] text-muted-foreground flex items-center justify-between gap-1">
                      <span className="truncate">{c.label}</span>
                      {c.source === "presupuestado" && (
                        <span className="text-[9px] uppercase opacity-60">ppto</span>
                      )}
                    </div>
                    <div className="font-semibold">${c.value.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumen total esperado */}
          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div className="border rounded p-3">
              <div className="text-muted-foreground text-xs">Costo total esperado</div>
              <div className="text-lg font-bold">${totalExpectedCost.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">mercancía + costos fijos</div>
            </div>
            <div className="border rounded p-3">
              <div className="text-muted-foreground text-xs">Costos fijos</div>
              <div className="text-lg font-bold">${fixedCostsTotal.toLocaleString()}</div>
            </div>
            <div className={`border rounded p-3 ${netExpectedMargin >= 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-destructive/10 border-destructive/30"}`}>
              <div className="text-muted-foreground text-xs">Margen neto esperado</div>
              <div className={`text-lg font-bold ${netExpectedMargin >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                ${netExpectedMargin.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground">ingresos − mercancía − costos fijos</div>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="p-3 border-b flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-semibold text-sm">Inventario asignado</h3>
            <Button size="sm" variant="outline" onClick={handleExportEstampacion} disabled={inventory.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Descargar para estampación
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <DebouncedSearchInput
                value={inventorySearch}
                onChange={setInventorySearch}
                placeholder="Buscar referencia, color o producto..."
                className="pl-8 h-9 w-full"
              />
            </div>
            <Select value={brandFilter || "all"} onValueChange={(v) => setBrandFilter((v === "all" ? "" : v) as any)}>
              <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Marca" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="magical">Magical</SelectItem>
                <SelectItem value="sweatspot">Sweatspot</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Color o variante"
              value={colorFilter}
              onChange={(e) => setColorFilter(e.target.value)}
              className="w-40 h-9"
            />
            {(inventorySearch || brandFilter || colorFilter) && (
              <Button variant="ghost" size="sm" className="h-9" onClick={() => { setInventorySearch(""); setBrandFilter(""); setColorFilter(""); }}>
                Limpiar filtros
              </Button>
            )}

            <span className="text-xs text-muted-foreground ml-auto">{filteredInventory.length} de {inventory.length} referencias</span>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Marca</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Pedido</TableHead>
              {canSeeFinancials && <TableHead className="text-right">Costo</TableHead>}
              {canSeeFinancials && <TableHead className="text-right">Precio</TableHead>}
              {canEditQuantity && <TableHead></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInventory.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Sin productos que coincidan con el filtro</TableCell></TableRow>
                ) : filteredInventory.map((it) => {
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
