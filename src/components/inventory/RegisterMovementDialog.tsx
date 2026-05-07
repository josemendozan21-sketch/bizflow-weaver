import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowDownToLine, ArrowUpFromLine, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { useInventory } from "@/hooks/useInventory";
import { useFerias } from "@/hooks/useFerias";
import { useInventoryMovements, type MovementArea, type MovementDirection } from "@/hooks/useInventoryMovements";

const AREAS: { value: MovementArea; label: string }[] = [
  { value: "produccion", label: "Producción" },
  { value: "estampacion", label: "Estampación" },
  { value: "logistica", label: "Logística" },
  { value: "asesor_comercial", label: "Asesor Comercial" },
  { value: "feria", label: "Feria (entrega a Logística)" },
];

const RegisterMovementDialog = () => {
  const [open, setOpen] = useState(false);
  const { stockItems } = useInventory();
  const { ferias } = useFerias();
  const { createMovement } = useInventoryMovements();

  const [direction, setDirection] = useState<MovementDirection>("entrega");
  const [area, setArea] = useState<MovementArea>("produccion");
  const [feriaId, setFeriaId] = useState<string>("");
  const [brand, setBrand] = useState<string>("");
  const [stockItemId, setStockItemId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const brands = useMemo(
    () => Array.from(new Set(stockItems.map((s) => s.brand))).sort(),
    [stockItems],
  );
  const itemsForBrand = useMemo(
    () => stockItems.filter((s) => s.brand === brand).sort((a, b) => a.name.localeCompare(b.name)),
    [stockItems, brand],
  );
  const selectedItem = useMemo(
    () => stockItems.find((s) => s.id === stockItemId) || null,
    [stockItems, stockItemId],
  );
  const activeFerias = useMemo(
    () => ferias.filter((f) => f.status !== "finalizada" && f.status !== "cancelada"),
    [ferias],
  );

  useEffect(() => {
    if (!open) {
      setDirection("entrega");
      setArea("produccion");
      setFeriaId("");
      setBrand("");
      setStockItemId("");
      setQuantity("");
      setReason("");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!selectedItem) return toast.error("Selecciona un ítem");
    const qty = Number(quantity);
    if (!qty || qty <= 0) return toast.error("Cantidad inválida");
    if (area === "feria" && !feriaId) return toast.error("Selecciona la feria");
    if (direction === "entrega" && qty > selectedItem.available) {
      return toast.error(`Stock insuficiente. Disponible: ${selectedItem.available}`);
    }

    setSubmitting(true);
    const reasonFinal = area === "feria" && feriaId
      ? `Feria: ${activeFerias.find((f) => f.id === feriaId)?.name || ""}${reason ? " — " + reason : ""}`
      : reason || null;

    const res = await createMovement({
      stock_item_id: selectedItem.id,
      item_name: selectedItem.name,
      brand: selectedItem.brand,
      category: selectedItem.category,
      quantity: qty,
      direction,
      area,
      feria_id: area === "feria" ? feriaId : null,
      reason: reasonFinal,
    });
    setSubmitting(false);
    if (res.success) {
      toast.success(res.message);
      setOpen(false);
    } else {
      toast.error(res.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <PackagePlus className="h-4 w-4" /> Registrar movimiento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar movimiento de inventario</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Tipo</Label>
            <RadioGroup
              value={direction}
              onValueChange={(v) => setDirection(v as MovementDirection)}
              className="grid grid-cols-2 gap-2"
            >
              <Label className="flex items-center gap-2 border rounded-md p-3 cursor-pointer hover:bg-muted">
                <RadioGroupItem value="entrega" />
                <ArrowUpFromLine className="h-4 w-4" /> Entrega
              </Label>
              <Label className="flex items-center gap-2 border rounded-md p-3 cursor-pointer hover:bg-muted">
                <RadioGroupItem value="retorno" />
                <ArrowDownToLine className="h-4 w-4" /> Retorno
              </Label>
            </RadioGroup>
          </div>

          <div>
            <Label>Área {direction === "entrega" ? "destino" : "origen"}</Label>
            <Select value={area} onValueChange={(v) => setArea(v as MovementArea)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AREAS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {area === "feria" && (
            <div>
              <Label>Feria</Label>
              <Select value={feriaId} onValueChange={setFeriaId}>
                <SelectTrigger><SelectValue placeholder="Selecciona feria" /></SelectTrigger>
                <SelectContent>
                  {activeFerias.length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">Sin ferias activas</div>
                  )}
                  {activeFerias.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name} — {f.city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Marca</Label>
              <Select value={brand} onValueChange={(v) => { setBrand(v); setStockItemId(""); }}>
                <SelectTrigger><SelectValue placeholder="Marca" /></SelectTrigger>
                <SelectContent>
                  {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cantidad</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <Label>Ítem</Label>
            <Select value={stockItemId} onValueChange={setStockItemId} disabled={!brand}>
              <SelectTrigger><SelectValue placeholder={brand ? "Selecciona ítem" : "Primero elige marca"} /></SelectTrigger>
              <SelectContent>
                {itemsForBrand.map((it) => (
                  <SelectItem key={it.id} value={it.id}>
                    {it.name} <span className="text-muted-foreground">· disp. {it.available}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedItem && (
              <p className="text-xs text-muted-foreground mt-1">
                Disponible actual: <strong>{selectedItem.available}</strong> {selectedItem.unit}
              </p>
            )}
          </div>

          <div>
            <Label>Motivo / observaciones</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Para pedido de cliente X, devolución por defecto, etc."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Registrando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RegisterMovementDialog;