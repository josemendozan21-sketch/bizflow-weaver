import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpFromLine, Plus, X } from "lucide-react";
import { PosProduct, useRegisterPosExits } from "@/hooks/usePuntosVenta";
import { POS_EXIT_REASONS, validatePosExitBatch } from "@/lib/posExit";
import { toast } from "sonner";

type Props = { locationId: string; products: PosProduct[] };

type Line = { key: number; product_id: string; quantity: number };

let nextKey = 1;
const newLine = (): Line => ({ key: nextKey++, product_id: "", quantity: 0 });

export function PuntoSalidaForm({ locationId, products }: Props) {
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [reason, setReason] = useState("");
  const [destination, setDestination] = useState("");
  const [notes, setNotes] = useState("");
  const exit = useRegisterPosExits(locationId);

  const byId = new Map(products.map((p) => [p.id, p]));
  const availableById = Object.fromEntries(products.map((p) => [p.id, Number(p.available)]));
  const nameById = Object.fromEntries(products.map((p) => [p.id, p.name]));
  const r = POS_EXIT_REASONS.find((x) => x.value === reason);

  const usedIds = lines.map((l) => l.product_id).filter(Boolean);
  const totalUnits = lines.reduce((s, l) => s + (l.quantity > 0 ? l.quantity : 0), 0);
  const filledProducts = new Set(usedIds).size;

  const setLine = (key: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const removeLine = (key: number) =>
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));

  const handleSubmit = async () => {
    const clean = lines
      .filter((l) => l.product_id)
      .map((l) => ({ product_id: l.product_id, quantity: l.quantity }));
    const err = validatePosExitBatch({
      lines: clean.length ? clean : [{ product_id: "", quantity: 0 }],
      availableById,
      nameById,
      reason,
      notes: notes || undefined,
    });
    if (err) return toast.error(err);
    try {
      await exit.mutateAsync({
        lines: clean,
        reason,
        destination: destination || undefined,
        notes: notes || undefined,
      });
      toast.success(
        clean.length > 1
          ? `Salida registrada: ${clean.length} productos, ${totalUnits} unidades`
          : "Salida registrada"
      );
      setLines([newLine()]);
      setReason("");
      setDestination("");
      setNotes("");
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowUpFromLine className="h-5 w-5 text-primary" /> Registrar salida de producto
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Mercancía que sale del punto sin venderse. Puedes sacar varios productos juntos con un solo
          motivo. Descuenta el stock; no mueve dinero de caja.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label>Productos *</Label>
          {lines.map((line) => {
            const product = byId.get(line.product_id);
            const max = product ? Number(product.available) : undefined;
            return (
              <div key={line.key} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <Select
                    value={line.product_id}
                    onValueChange={(v) => setLine(line.key, { product_id: v, quantity: 0 })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => {
                        const takenByOther = usedIds.includes(p.id) && p.id !== line.product_id;
                        return (
                          <SelectItem
                            key={p.id}
                            value={p.id}
                            disabled={takenByOther || Number(p.available) <= 0}
                          >
                            {p.name} {p.brand ? `· ${p.brand}` : ""} (stock: {p.available})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-20 shrink-0">
                  <Input
                    type="number"
                    min={1}
                    max={max}
                    placeholder="Cant."
                    value={line.quantity || ""}
                    onChange={(e) => setLine(line.key, { quantity: Number(e.target.value) })}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => removeLine(line.key)}
                  disabled={lines.length === 1}
                  aria-label="Quitar producto"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => setLines((p) => [...p, newLine()])}>
              <Plus className="mr-1 h-4 w-4" /> Agregar producto
            </Button>
            <span className="text-xs text-muted-foreground">
              {filledProducts} {filledProducts === 1 ? "referencia" : "referencias"} · {totalUnits}{" "}
              {totalUnits === 1 ? "unidad" : "unidades"}
            </span>
          </div>
        </div>

        <div>
          <Label>Motivo *</Label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona motivo" />
            </SelectTrigger>
            <SelectContent>
              {POS_EXIT_REASONS.map((x) => (
                <SelectItem key={x.value} value={x.value}>
                  {x.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Destino / proveedor</Label>
          <Input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Ej: Bodega principal, nombre del proveedor o cliente"
          />
        </div>

        <div>
          <Label>Notas {r?.notesRequired ? "*" : ""}</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <Button onClick={handleSubmit} disabled={exit.isPending} className="w-full">
          {exit.isPending
            ? "Registrando..."
            : `Registrar salida${filledProducts > 1 ? ` de ${filledProducts} productos` : ""}`}
        </Button>
      </CardContent>
    </Card>
  );
}
