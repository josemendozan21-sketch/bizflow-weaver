import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PackagePlus, Truck, Factory, Stamp, Globe, Flag, Undo2, Tent } from "lucide-react";
import { useInventory } from "@/hooks/useInventory";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Source =
  | "estampacion"
  | "produccion"
  | "importado"
  | "nacional"
  | "devolucion_cliente"
  | "devolucion_feria";

const SOURCES: { value: Source; label: string; icon: any; area: string; description: string }[] = [
  { value: "estampacion", label: "Desde Estampación", icon: Stamp, area: "estampacion", description: "Cuerpos estampados que regresan a inventario" },
  { value: "produccion", label: "Desde Producción", icon: Factory, area: "produccion", description: "Cuerpos o producto terminado desde producción" },
  { value: "importado", label: "Producto importado", icon: Globe, area: "logistica", description: "Mercancía importada que ingresa al inventario" },
  { value: "nacional", label: "Producto nacional", icon: Flag, area: "logistica", description: "Compra a proveedor nacional" },
  { value: "devolucion_cliente", label: "Devolución de cliente", icon: Undo2, area: "logistica", description: "Producto devuelto por un cliente" },
  { value: "devolucion_feria", label: "Devolución de feria", icon: Tent, area: "feria", description: "Producto sobrante que regresa de una feria" },
];

const CATEGORIES = [
  { value: "cuerpos_referencias", label: "Cuerpos / Referencias" },
  { value: "producto_terminado", label: "Producto terminado" },
  { value: "materia_prima", label: "Materia prima" },
];

const UNITS = ["unidades", "gramos", "kilos", "tarros"];

const ReceptionPanel = () => {
  const { user } = useAuth();
  const { stockItems, addStock, refetch } = useInventory();
  const [source, setSource] = useState<Source | null>(null);
  const [brand, setBrand] = useState("magical");
  const [category, setCategory] = useState("cuerpos_referencias");
  const [itemName, setItemName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("unidades");
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filteredItems = useMemo(
    () => stockItems.filter((i) => i.brand === brand && i.category === category),
    [stockItems, brand, category],
  );

  const reset = () => {
    setItemName(""); setQty(""); setSupplier(""); setNotes("");
  };

  const handleSubmit = async () => {
    if (!source) return;
    const amount = Number(qty);
    if (!itemName.trim() || !amount || amount <= 0) {
      toast.error("Ingresa la referencia y una cantidad válida");
      return;
    }
    setSubmitting(true);
    const cfg = SOURCES.find((s) => s.value === source)!;
    const stockRes = await addStock(itemName.trim(), amount, category, brand, unit);
    if (!stockRes.success) {
      toast.error(stockRes.message);
      setSubmitting(false);
      return;
    }

    // Audit log (AUTO_REQ marker skips trigger stock changes & notifications)
    const matched = stockItems.find(
      (s) => s.name.toLowerCase() === itemName.trim().toLowerCase() && s.brand === brand && s.category === category,
    );
    await supabase.from("inventory_movements" as any).insert({
      stock_item_id: matched?.id ?? null,
      item_name: itemName.trim(),
      brand,
      category,
      quantity: amount,
      direction: "retorno",
      area: cfg.area,
      entry_type: source,
      supplier: supplier.trim() || null,
      reason: `AUTO_REQ: Recepción ${cfg.label}${notes ? " — " + notes.trim() : ""}`,
      recorded_by: user?.id,
      recorded_by_name: user?.email || "Inventarios",
    } as any);

    toast.success(`Recepción registrada: +${amount} ${unit} de "${itemName.trim()}"`);
    reset();
    refetch();
    setSubmitting(false);
  };

  if (!source) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">¿De dónde viene la mercancía?</h2>
          <p className="text-sm text-muted-foreground">Selecciona el origen para registrar la recepción al inventario.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SOURCES.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.value}
                onClick={() => setSource(s.value)}
                className="text-left rounded-lg border bg-card p-4 hover:border-primary hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-primary/10 p-2 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const cfg = SOURCES.find((s) => s.value === source)!;
  const Icon = cfg.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">{cfg.label}</CardTitle>
              <CardDescription>{cfg.description}</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setSource(null); reset(); }}>
            Cambiar origen
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Marca</Label>
          <Select value={brand} onValueChange={setBrand}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="magical">Magical Warmers</SelectItem>
              <SelectItem value="sweatspot">Sweatspot</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Categoría</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label>Referencia / ítem</Label>
          <Input
            list="reception-items"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="Ej. Termo 500ml, Cuerpo frío 350ml..."
          />
          <datalist id="reception-items">
            {filteredItems.map((i) => <option key={i.id} value={i.name} />)}
          </datalist>
          {itemName && !filteredItems.some((i) => i.name.toLowerCase() === itemName.toLowerCase()) && (
            <Badge variant="outline" className="mt-1 text-xs">Se creará como nueva referencia</Badge>
          )}
        </div>
        <div>
          <Label>Cantidad</Label>
          <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
        <div>
          <Label>Unidad</Label>
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {(source === "importado" || source === "nacional") && (
          <div className="md:col-span-2">
            <Label>Proveedor</Label>
            <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Nombre del proveedor" />
          </div>
        )}
        <div className="md:col-span-2">
          <Label>Notas (opcional)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Detalles adicionales, número de remisión, cliente, feria, etc." />
        </div>
        <div className="md:col-span-2">
          <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2">
            <PackagePlus className="h-4 w-4" /> Registrar recepción
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReceptionPanel;